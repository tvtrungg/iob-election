# ElectionDecentralizedMaster: Decentralized Voting System on Ethereum

## Introduction

ElectionDecentralizedMaster is a decentralized voting system built on Ethereum. It uses a multi-role governance model (admins + registrars) to reduce single points of failure, and supports three voting mechanisms:

- **FPTP_Quorum**: First-Past-The-Post with a turnout quorum requirement.
- **Proportionnel**: Integer percentage-based proportional distribution.
- **InstantRunoff (IRV)**: Ranked-choice voting with iterative elimination.

The system is intended for educational purposes, small-scale elections (e.g., student councils, DAOs, associations), and demonstrations of on-chain governance and tallying.

---

## Features

- **Multi-Party Governance**
  - **Admin committee (N = 4)**: election closure requires a **3/4 super-majority**.
  - **Registrar committee (M = 3)**: voter registration requires **2/3 registrar validations per voter**.
- **Voting Systems**
  - **FPTP_Quorum**: winner-takes-all, requires **strictly > 50% turnout** among registered voters.
  - **Proportionnel**: returns integer percentage shares per candidate.
  - **InstantRunoff (IRV)**: full ranking ballots (5 candidates), iterative elimination until strict majority.
- **Integrity Controls**
  - One vote per registered address.
  - One vote per identity hash (ID is hashed on-chain).
  - Deterministic on-chain tallying.
- **Frontend dApp**
  - Wallet connection
  - Voter status dashboard
  - Voting UI (radio for FPTP/Proportional, drag-and-drop ranking for IRV)
  - Admin/Registrar dashboard
  - Result visualization (bar/pie charts)
- **Local testing**
  - Compatible with Ganache for gas-free demonstrations.

---

## Requirements

### Blockchain tools

- **Ganache** (recommended for local testing) OR an Ethereum testnet (e.g., Sepolia) with test ETH
- **MetaMask** wallet

### Development

- **Remix IDE** for compiling/deploying the smart contract
- A local web server to host the frontend (e.g., **VS Code Live Server** or `npx http-server`)

### Browser

- Modern browser (Chrome/Firefox) with MetaMask extension

---

## Deployment

### Step 1: Deploy the Smart Contract (Remix)

1. Open Remix IDE and load the Solidity contract file (e.g., `ElectionDecentralizedMaster.sol` / `Election.sol` depending on repository structure).
2. Compile using Solidity version **^0.8.0**.
3. Choose your network:

#### Option A - Local (Ganache)**

- Start Ganache and note:
  - RPC URL: `http://127.0.0.1:7545`
  - Chain ID: `1337` (common default)
- In Remix:
  - Set Environment to **Dev - Ganache Provider**
  - Endpoint: `http://127.0.0.1:7545`

#### Option B - Testnet (Sepolia)

- In Remix:
  - Set Environment to **Injected Provider - MetaMask**
  - Switch MetaMask network to Sepolia

4. Deploy the contract with constructor parameters:
   - Select VotingSystem:
     - `0` = FPTP_Quorum
     - `1` = Proportionnel
     - `2` = InstantRunoff (IRV)
   - Provide arrays for:
     - **4 admin addresses** (N = 4)
     - **3 registrar addresses** (M = 3)

5. After deployment:
   - Copy the deployed **contract address**
   - Export the **ABI** and save it to `abi.json` (or wherever your frontend expects it)

---

## Frontend Setup

1. Clone or download the repository.
2. Update the frontend configuration (usually in `script.js`):
   - Set `contractAddress` to the deployed contract address
   - Set `chainId`:
     - Ganache: `1337`
     - Sepolia: `11155111`
   - Ensure the provider/RPC matches your environment:
     - Ganache example: `new Web3("http://127.0.0.1:7545")`

3. Run the frontend:
   - VS Code Live Server, **or**
   - `npx http-server` then open the shown URL

---

## Usage Guide (Manual Testing)

### Step 1: Connect Wallet

1. Open the website in a browser with MetaMask.
2. Click **Connect Wallet** and approve the connection.
3. The dashboard displays your status (registered/validation count/voted).

### Step 2: Register as a Voter

1. In **Voter Registration**, enter an ID string (any unique string, e.g., `ID_001`).
2. Submit - this step is **off-chain** (UI only). Share:
   - your **wallet address**
   - your **ID string**
     with the registrars.

### Step 3: Registrar Validation (M = 3, threshold = 2)

1. Registrars connect with their registrar accounts.
2. In the registrar panel:
   - Enter the voter address + ID string
   - Click **Validate Voter**
3. A voter becomes fully registered after **2 out of 3 registrars** validate the same voter+ID.

### Step 4: Cast a Vote

1. As a registered voter (and while election is open), go to **Cast Your Vote**.
2. Re-enter the same ID string for verification.
3. Vote depending on the deployed system:
   - FPTP_Quorum: select one candidate
   - Proportionnel: select one candidate
   - IRV: submit a full ranking of 5 candidates
4. Confirm the transaction in MetaMask.

### Step 5: Admin Closure (N = 4, threshold = 3)

1. Admins connect with their admin accounts.
2. Click **Close Election**.
3. The election closes only after **3 out of 4 admins** have approved closure.

### Step 6: View Results

1. Once closed, the **Election Results** section displays:
   - system label
   - winner/status message
   - chart (bar for FPTP/IRV, pie for Proportional)

---

## Test Checklist

### Registration

- Validate a voter with only 1 registrar approval --> not registered
- Validate with 2/3 approvals --> registered
- Ensure a registrar cannot validate the same ID twice

### Voting

- Voting as unregistered voter --> should revert
- Voting with wrong ID --> should revert
- Double voting from same address --> should revert
- Reusing the same ID for another address --> should revert

### Closure & Results

- Attempt closure with fewer than 3/4 admin approvals --> election stays open
- Reach 3/4 approvals --> election closes and results become available
- Voting after closure --> should revert

---

## Contributors

- Vinh-Trung THIEU
- Yousr BENTOUNES
