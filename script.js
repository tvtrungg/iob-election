const contractAddress = "0x61cFfE10a9C9b289dc8c5a7C05B91D9580f967C8"; // Replace with actual contract address
const chainId = 1337; // Sepolia testnet (replace with 1337 for Ganache)
const candidates = [1, 2, 3, 4, 5]; // 5 fixed candidates
const votingSystems = ["FPTP_Quorum", "Proportionnel", "InstantRunoff"]; // Index 0,1,2
const gasLimit = 5000000;

let web3;
let contract;
let account;

// Initialize Web3 and contract
async function initWeb3() {
  if (window.ethereum) {
    web3 = new Web3("http://127.0.0.1:7545"); // Connect to local Ganache
    try {
      const abi = await fetch("abi.json").then((res) => res.json());
      contract = new web3.eth.Contract(abi, contractAddress);
    } catch (error) {
      alert("Contract initialization error: " + error.message);
      return false;
    }
  } else {
    alert("Please install MetaMask!");
    return false;
  }
}

// Connect wallet
async function connectWallet() {
  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];

    document.getElementById("connect-button").disabled = true;
    document.getElementById("connect-button").style.display = "none";
    document.getElementById("wallet-address").style.display = "block";
    document.getElementById("wallet-address").querySelector(".address-text").innerText = account;

    await loadStatus();
    await checkUserRole();
    startPolling();
  } catch (error) {
    alert("Connection failed: " + error.message);
  }
}

// Load election status
async function loadStatus() {
  try {
    const currentSystem = await contract.methods.currentSystem().call();
    const electionClosed = await contract.methods.electionClosed().call();
    const totalRegistered = await contract.methods.totalVotersRegistered().call();
    const totalCast = await contract.methods.totalVotesCast().call();

    document.getElementById("election-system").innerText = votingSystems[Number(currentSystem)];
    document.getElementById("election-status").innerText = electionClosed ? "Closed" : "Open";
    document.getElementById("total-registered").innerText = totalRegistered;
    document.getElementById("total-cast").innerText = totalCast;

    // Hiển thị form vote dựa trên system
    const system = Number(currentSystem);
    document.getElementById("vote-form-fptp").style.display = system !== 2 ? "block" : "none";
    document.getElementById("vote-form-irv").style.display = system === 2 ? "block" : "none";

    // Check voter status
    const voter = await contract.methods.voters(account).call();
    document.getElementById("voter-status").innerText = voter.isRegistered
      ? "Registered"
      : `Awaiting verification (${voter.validationCount}/2)`;
    document.getElementById("has-voted").innerText = voter.hasVoted ? "Voted" : "Not yet voted";

    if (electionClosed) {
      await loadResults();
      document.getElementById("vote-section").style.display = "none";
      document.getElementById("results-section").style.display = "block";
    } else {
      document.getElementById("vote-section").style.display = "block";
      document.getElementById("results-section").style.display = "none";
    }
    await checkUserRole();
  } catch (error) {
    alert("Error loading status: " + error.message);
  }
}

// Poll status every 5 seconds
let pollInterval;
function startPolling() {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(loadStatus, 5000);
}

// Check role (admin or registrar)
async function checkUserRole() {
  try {
    const isAdmin = await contract.methods.isAdmin(account).call();
    const isRegistrar = await contract.methods.isRegistrar(account).call();
    const electionClosed = await contract.methods.electionClosed().call(); // Lấy thêm trạng thái closed

    if (isAdmin || isRegistrar) {
      document.getElementById("admin-section").style.display = "block";

      if (isAdmin) {
        const buttonHTML = `
          <button id="propose-close-btn" 
                  onclick="proposeClose()" 
                  class="btn-primary btn-vote" 
                  ${electionClosed ? "disabled" : ""} 
                  title="${electionClosed ? "Election already closed" : "Propose to close election"}">
            ${electionClosed ? "Election Closed" : "Close Election"}
          </button>
        `;
        document.getElementById("admin-actions").innerHTML = buttonHTML;
      }

      if (isRegistrar) {
        document.getElementById("registrar-actions").innerHTML = `
          <div class="form-group">
            <label for="voter-address">
              <i class="fas fa-id-card"></i>
              Voter Address
            </label>
            <input id="voter-address" type="text" placeholder="Enter Voter Address" aria-label="Voter Address" />
          </div>
          <div class="form-group">
            <label for="voter-id">
              <i class="fas fa-id-card"></i>
              ID Carte
            </label>
            <input id="voter-id" type="text" placeholder="Enter ID Carte" aria-label="ID Carte" />
          </div>
          <button onclick="validateVoter()" class="btn-primary btn-vote">Validate Voter</button>
        `;
      }
    } else {
      document.getElementById("admin-section").style.display = "none";
    }
  } catch (error) {
    console.error("Error checking role:", error);
  }
}

// Đăng ký cử tri (voter nhập ID, poll validation)
async function registerVoter() {
  const idCarte = document.getElementById("reg-id").value.trim();
  if (!idCarte) return alert("Enter Card ID!");
  // Voter chỉ nhập ID, registrar sẽ validate off-chain or via input in dashboard
  // Ở đây, chỉ poll validationCount
  alert("ID has been sent. Waiting for registrar verification. Status will update automatically.");
  document.getElementById("reg-id").value = "";
}

// Cast vote
async function castVote() {
  try {
    const system = Number(await contract.methods.currentSystem().call());
    let choices = [];
    const idCarte = document.getElementById("vote-id").value.trim();
    if (!idCarte) return alert("Enter Card ID!");

    if (system === 2) {
      // InstantRunoff
      choices = getIrvPreferences();
      if (choices.length !== 5 || new Set(choices).size !== 5) return alert("Must rank all 5 different candidates!");
    } else {
      // FPTP or Proportionnel
      const selected = document.querySelector('input[name="candidate"]:checked');
      if (!selected) return alert("Select a candidate!");
      choices = [Number(selected.value)];
    }

    const tx = await contract.methods.castVote(choices, idCarte).send({ from: account, gas: gasLimit });
    alert("Vote successful! Tx: " + tx.transactionHash);
    loadStatus();
  } catch (error) {
    alert("Vote failed: " + error.message);
  }
}

// Lấy preferences từ sortable list
function getIrvPreferences() {
  const items = document.querySelectorAll("#irv-list li");
  return Array.from(items).map((item) => Number(item.dataset.candidate));
}

// Propose close (for admin)
async function proposeClose() {
  try {
    const electionClosed = await contract.methods.electionClosed().call();
    if (electionClosed) {
      alert("Election already closed!");
      return;
    }
    const tx = await contract.methods.proposeAndCloseElection().send({ from: account, gas: gasLimit });
    alert("Proposal sent successfully! Waiting for multi-sig. Tx: " + tx.transactionHash);
  } catch (error) {
    alert("Proposal failed: " + error.message);
  }
}

// Validate voter (for registrar)
async function validateVoter() {
  const voterAddress = document.getElementById("voter-address").value.trim();
  const idCarte = document.getElementById("voter-id").value.trim();
  if (!voterAddress || !idCarte) return alert("Nhập đầy đủ!");
  try {
    const tx = await contract.methods.validateVoter(voterAddress, idCarte).send({ from: account, gas: gasLimit });
    alert("Validation successful! Tx: " + tx.transactionHash);
  } catch (error) {
    alert("Validation failed: " + error.message);
  }
}

function toNumber(bigIntValue) {
  if (typeof bigIntValue === "bigint") {
    return Number(bigIntValue);
  }
  return bigIntValue;
}

// Helper cho array BigInt → array number
function toNumberArray(bigIntArray) {
  return bigIntArray.map(toNumber);
}

// Load results and draw chart
async function loadResults() {
  try {
    const results = await contract.methods.getResults().call();
    const system = results[0];
    const winnerMsg = results[1];
    const scores = toNumberArray(results[2]);

    document.getElementById("results-system").innerText = system;

    const winnerBox = document.getElementById("winner-box");
    const winnerNameEl = document.getElementById("results-winner");

    // Xử lý winner message
    if (winnerMsg.includes("Quorum non atteint") || winnerMsg.includes("Aucun vote")) {
      winnerBox.style.display = "inline-flex";
      winnerBox.style.background = "linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))";
      winnerBox.style.borderColor = "var(--danger)";
      winnerBox.querySelector("i").className = "fas fa-exclamation-triangle";
      winnerNameEl.innerText = winnerMsg; // Ví dụ: "Quorum non atteint (<50%)"
      winnerNameEl.style.color = "var(--danger)";
      winnerBox.querySelector(".winner-label").innerText = "Result";
    } else {
      // Có winner
      winnerBox.style.display = "inline-flex";
      winnerBox.style.background = "linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 179, 8, 0.1))";
      winnerBox.style.borderColor = "var(--warning)";
      winnerBox.querySelector("i").className = "fas fa-crown";
      // Lấy tên winner sạch (loại "Gagnant: Candidat X")
      const cleanWinner = winnerMsg.replace("Gagnant: ", "").replace("Gagnant: Candidat ", "Candidate ");
      winnerNameEl.innerText = cleanWinner;
      winnerNameEl.style.color = "var(--warning)";
      winnerBox.querySelector(".winner-label").innerText = "Winner";
    }

    const canvas = document.getElementById("results-chart");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (system.includes("Proportionnel")) {
      drawPieChart(ctx, scores.slice(1));
    } else {
      drawBarChart(ctx, scores.slice(1));
    }
  } catch (error) {
    alert("Error loading results: " + error.message);
  }
}

// Draw bar chart
function drawBarChart(ctx, scores) {
  const barWidth = 40;
  const maxScore = Math.max(...scores);
  scores.forEach((score, i) => {
    const height = (score / maxScore) * 200;
    ctx.fillStyle = `hsl(${i * 72}, 50%, 50%)`;
    ctx.fillRect(i * 50 + 20, 250 - height, barWidth, height);
    ctx.fillStyle = "black";
    ctx.fillText(`Cand ${i + 1}: ${score}`, i * 50 + 10, 260);
  });
}

// Draw pie chart
function drawPieChart(ctx, scores) {
  let total = scores.reduce((a, b) => a + b, 0);
  let startAngle = 0;
  scores.forEach((score, i) => {
    const sliceAngle = (score / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(150, 150);
    ctx.arc(150, 150, 100, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = `hsl(${i * 72}, 50%, 50%)`;
    ctx.fill();
    startAngle += sliceAngle;
  });
  // Legend
  scores.forEach((score, i) => {
    ctx.fillStyle = `hsl(${i * 72}, 50%, 50%)`;
    ctx.fillRect(300, i * 20 + 50, 10, 10);
    ctx.fillStyle = "black";
    ctx.fillText(`Cand ${i + 1}: ${score}%`, 315, i * 20 + 60);
  });
}

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// Init drag & drop for IRV
function initDragDrop() {
  const list = document.getElementById("irv-list");
  let draggedItem = null;
  list.addEventListener("dragstart", (e) => (draggedItem = e.target));
  list.addEventListener("dragover", (e) => e.preventDefault());
  list.addEventListener("drop", (e) => {
    e.preventDefault();
    if (e.target.tagName === "LI") {
      list.insertBefore(draggedItem, e.target);
    }
  });
}

// On load
window.addEventListener("load", async () => {
  if (await initWeb3()) {
    if (localStorage.getItem("darkMode") === "true") toggleDarkMode();
    initDragDrop();
  }
});
