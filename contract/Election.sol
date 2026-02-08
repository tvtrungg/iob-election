// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Election {
    enum VotingSystem { FPTP_Quorum, Proportionnel, InstantRunoff }

    struct Voter {
        bool isRegistered;
        bool hasVoted;
        bytes32 hashedID;
        uint[] preferences;
        uint validationCount;
    }

    address[] public admins;
    mapping(address => bool) public isAdmin;
    uint public requiredAdminSignatures;
    uint public N_admins;
    mapping(address => bool) public closeElectionVotes;

    VotingSystem public currentSystem;
    bool public electionClosed;

    uint public constant NB_CANDIDATES = 5;
    uint public totalVotersRegistered;
    uint public totalVotesCast;
    uint[6] public firstChoiceCounts;


    mapping(address => bool) public isRegistrar;
    uint public requiredRegistrarSignatures;
    uint public M_registrars;

    mapping(bytes32 => mapping(address => bool)) public hasValidatedRegistration;
    mapping(bytes32 => address) private idToAddress;

    address[] private voterAddresses;
    mapping(address => Voter) public voters;
    mapping(bytes32 => bool) private idHasAlreadyVoted;


    event AdminActionApproved(address indexed approver, string action);
    event ElectionClosed();
    event ResultsPublished(string system, string winner, uint[6] scores);
    event VoterFullyRegistered(address indexed voter, bytes32 hashedID);
    event VoterValidationReceived(address indexed voter, address indexed registrar);
    event VoteCast(address indexed voter, uint[] choices);


    modifier onlyMultiAdmin() {
        require(isAdmin[msg.sender], "Seul un admin peut faire ca");
        _;
    }

    modifier onlyRegistrar() {
        require(isRegistrar[msg.sender], "Acces reserve aux Registrars");
        _;
    }

    constructor(
        VotingSystem _system,
        uint _N,
        address[] memory _admins,
        uint _M,
        address[] memory _registrars
    ) {
        require(_admins.length == _N, "Le nombre d'adresses admin ne correspond pas a N");
        require(_registrars.length == _M, "Le nombre d'adresses registrar ne correspond pas a M");
        require(_N > 0 && _M > 0, "N et M doivent etre superieurs a 0");

        currentSystem = _system;
        N_admins = _N;
        M_registrars = _M;
        
        requiredAdminSignatures = (2 * _N + 2) / 3;
        requiredRegistrarSignatures = (2 * _M + 2) / 3;

        for(uint i=0; i < _N; i++) {
            isAdmin[_admins[i]] = true;
            admins.push(_admins[i]);
        }
        for(uint j=0; j < _M; j++) {
            isRegistrar[_registrars[j]] = true;
        }
    }



    function proposeAndCloseElection() public onlyMultiAdmin {
        require(!electionClosed, "Deja close");
        require(!closeElectionVotes[msg.sender], "Vous avez deja vote pour clore");

        closeElectionVotes[msg.sender] = true;
        uint approvalCount = 0;

        for(uint i=0; i < admins.length; i++) {
            if(closeElectionVotes[admins[i]]) approvalCount++;
        }

        emit AdminActionApproved(msg.sender, "Cloture Election");

        if (approvalCount >= requiredAdminSignatures) {
            electionClosed = true;
            emit ElectionClosed();

            (string memory sys, string memory win, uint[6] memory scores) = getResults();
            emit ResultsPublished(sys, win, scores);
        }
    }



    function validateVoter(address _voterAddress, string memory _idCarte) public onlyRegistrar {
        bytes32 hID = keccak256(abi.encode(_idCarte));

        if (idToAddress[hID] == address(0)) { idToAddress[hID] = _voterAddress; }
        require(idToAddress[hID] == _voterAddress, "ID appartient deja a une autre adresse");
        require(!hasValidatedRegistration[hID][msg.sender], "Deja valide par vous");

        Voter storage v = voters[_voterAddress];
        require(!v.isRegistered, "Deja inscrit");

        v.hashedID = hID;
        v.validationCount++;
        hasValidatedRegistration[hID][msg.sender] = true;
        
        emit VoterValidationReceived(_voterAddress, msg.sender);

        if (v.validationCount >= requiredRegistrarSignatures) {
            v.isRegistered = true;
            totalVotersRegistered++;
            emit VoterFullyRegistered(_voterAddress, hID);
        }
    }



    function castVote(uint[] memory _choices, string memory _idCarteFourni) public {
        require(!electionClosed, "Election close");
        require(!isAdmin[msg.sender], "Les admins ne peuvent pas voter");

        Voter storage sender = voters[msg.sender];
        bytes32 hProvided = keccak256(abi.encode(_idCarteFourni));

        require(sender.isRegistered, "Inscription non validee par le quorum des registrars");
        require(hProvided == sender.hashedID, "ID incorrect");
        require(!sender.hasVoted, "Deja vote");
        require(!idHasAlreadyVoted[hProvided], "ID deja utilise");

        sender.hasVoted = true;
        idHasAlreadyVoted[hProvided] = true;
        totalVotesCast++;

        if (currentSystem == VotingSystem.InstantRunoff) {
            require(_choices.length == NB_CANDIDATES, "Classez les 5 candidats");
            sender.preferences = _choices;
            voterAddresses.push(msg.sender);
        } else {
            require(_choices.length == 1, "Un choix maximum");
            uint fav = _choices[0];
            require(fav >= 1 && fav <= NB_CANDIDATES, "Inexistant");
            firstChoiceCounts[fav]++;
        }

        emit VoteCast(msg.sender, _choices);
    }



    function getResults() public view returns (string memory system, string memory winnerMsg, uint[6] memory finalScores) {
        require(electionClosed, "Resultats verrouilles");

        if (currentSystem == VotingSystem.FPTP_Quorum) {
            return _calculateFPTP();
        } else if (currentSystem == VotingSystem.Proportionnel) {
            return _calculateProportionnel();
        } else {
            return _calculateInstantRunoff();
        }
    }



    function _calculateFPTP() private view returns (string memory, string memory, uint[6] memory) {
        if (totalVotesCast <= (totalVotersRegistered / 2)) return ("FPTP", "Quorum non atteint (<50%)", firstChoiceCounts);
        uint winner = 0; uint maxVotes = 0;
        for (uint i = 1; i <= NB_CANDIDATES; i++) {
            if (firstChoiceCounts[i] > maxVotes) { maxVotes = firstChoiceCounts[i]; winner = i; }
        }
        return ("FPTP", string(abi.encodePacked("Gagnant: Candidat ", uint2str(winner))), firstChoiceCounts);
    }

    function _calculateProportionnel() private view returns (string memory, string memory, uint[6] memory) {
        uint[6] memory percentages;
        if (totalVotesCast == 0) return ("Proportionnel", "Aucun vote", percentages);
        for (uint i = 1; i <= NB_CANDIDATES; i++) {
            percentages[i] = (firstChoiceCounts[i] * 100) / totalVotesCast;
        }
        return ("Proportionnel (%)", "Repartion des voix", percentages);
    }

    function _calculateInstantRunoff() private view returns (string memory, string memory, uint[6] memory) {
        bool[6] memory eliminated;
        uint[6] memory roundVotes;

        for (uint round = 0; round < NB_CANDIDATES - 1; round++) {
            for (uint c = 0; c <= NB_CANDIDATES; c++) roundVotes[c] = 0;

            for (uint i = 0; i < voterAddresses.length; i++) {
                uint[] memory prefs = voters[voterAddresses[i]].preferences;
                for (uint p = 0; p < NB_CANDIDATES; p++) {
                    if (!eliminated[prefs[p]]) {
                        roundVotes[prefs[p]]++;
                        break;
                    }
                }
            }

            for (uint c = 1; c <= NB_CANDIDATES; c++) {
                if (totalVotesCast > 0 && roundVotes[c] > totalVotesCast / 2) {
                    return ("Instant-Runoff", string(abi.encodePacked("Gagnant: ", uint2str(c))), roundVotes);
                }
            }

            uint minVotes = totalVotesCast + 1;
            uint toEliminate = 0;
            for (uint c = 1; c <= NB_CANDIDATES; c++) {
                if (!eliminated[c] && roundVotes[c] < minVotes) {
                    minVotes = roundVotes[c];
                    toEliminate = c;
                }
            }
            if (toEliminate != 0) eliminated[toEliminate] = true;
        }
        return ("Instant-Runoff", "Calcul termine", roundVotes);
    }

    function uint2str(uint _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint j = _i; uint len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bstr[k] = bytes1(temp);
            _i /= 10;
        }
        return string(bstr);
    }
}