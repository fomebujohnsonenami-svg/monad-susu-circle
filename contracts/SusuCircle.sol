// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SusuCircle
 * @notice Rotating savings circle (ROSCA): members contribute each round and one
 *         recipient receives the pooled funds per round in a fixed rotation order.
 */
contract SusuCircle {
    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum CircleStatus {
        Open, // Accepting participants
        Active, // Deposits and payouts in progress
        Completed, // All rounds finished
        Cancelled // Cancelled before start
    }

    struct Circle {
        address creator;
        uint256 contributionAmount;
        uint256 totalRounds;
        uint256 roundInterval; // Seconds between round start times
        uint256 currentRound; // 0-indexed active round
        uint256 roundStartTime; // Timestamp when the current round opened
        uint256 paidCount; // Deposits received in the current round
        CircleStatus status;
        address[] participants;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    uint256 public nextCircleId;
    mapping(uint256 => Circle) private _circles;

    /// @dev circleId => member => enrolled
    mapping(uint256 => mapping(address => bool)) public isParticipant;

    /// @dev circleId => round => member => deposited
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaidRound;

    /// @dev circleId => member => received payout
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;

    uint256 private _locked = 1;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event CircleCreated(
        uint256 indexed circleId,
        address indexed creator,
        uint256 contributionAmount,
        uint256 totalRounds,
        uint256 roundInterval
    );

    event JoinedCircle(uint256 indexed circleId, address indexed participant, uint256 participantIndex);

    event CircleStarted(uint256 indexed circleId, uint256 startTime, uint256 participantCount);

    event RoundDeposit(
        uint256 indexed circleId,
        uint256 indexed round,
        address indexed participant,
        uint256 amount
    );

    event RoundPayout(
        uint256 indexed circleId,
        uint256 indexed round,
        address indexed recipient,
        uint256 amount
    );

    event CircleCompleted(uint256 indexed circleId);

    event CircleCancelled(uint256 indexed circleId, address indexed creator);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier nonReentrant() {
        require(_locked == 1, "ReentrancyGuard: reentrant call");
        _locked = 2;
        _;
        _locked = 1;
    }

    modifier circleExists(uint256 circleId) {
        require(circleId < nextCircleId, "Circle does not exist");
        _;
    }

    // -------------------------------------------------------------------------
    // External functions
    // -------------------------------------------------------------------------

    /**
     * @notice Create a new savings circle. The creator is automatically enrolled
     *         as the first participant.
     * @param contributionAmount Fixed wei amount each member pays every round.
     * @param totalRounds Number of rounds (equals max participants).
     * @param roundInterval Minimum seconds before a round payout can execute.
     */
    function createCircle(
        uint256 contributionAmount,
        uint256 totalRounds,
        uint256 roundInterval
    ) external returns (uint256 circleId) {
        require(contributionAmount > 0, "Contribution must be > 0");
        require(totalRounds >= 2, "Need at least 2 rounds");
        require(roundInterval > 0, "Interval must be > 0");

        circleId = nextCircleId++;
        Circle storage circle = _circles[circleId];

        circle.creator = msg.sender;
        circle.contributionAmount = contributionAmount;
        circle.totalRounds = totalRounds;
        circle.roundInterval = roundInterval;
        circle.status = CircleStatus.Open;

        _addParticipant(circleId, msg.sender);

        emit CircleCreated(circleId, msg.sender, contributionAmount, totalRounds, roundInterval);
    }

    /**
     * @notice Join an open circle before it starts. Payout order follows join order.
     */
    function joinCircle(uint256 circleId) external circleExists(circleId) {
        Circle storage circle = _circles[circleId];

        require(circle.status == CircleStatus.Open, "Circle not open");
        require(!isParticipant[circleId][msg.sender], "Already joined");
        require(circle.participants.length < circle.totalRounds, "Circle is full");

        _addParticipant(circleId, msg.sender);

        emit JoinedCircle(circleId, msg.sender, circle.participants.length - 1);

        if (circle.participants.length == circle.totalRounds) {
            _startCircle(circleId);
        }
    }

    /**
     * @notice Creator can manually start a full circle if auto-start did not run.
     */
    function startCircle(uint256 circleId) external circleExists(circleId) {
        Circle storage circle = _circles[circleId];

        require(msg.sender == circle.creator, "Only creator");
        require(circle.status == CircleStatus.Open, "Circle not open");
        require(circle.participants.length == circle.totalRounds, "Circle not full");

        _startCircle(circleId);
    }

    /**
     * @notice Pay the contribution for the active round.
     */
    function depositRoundFunds(uint256 circleId)
        external
        payable
        circleExists(circleId)
    {
        Circle storage circle = _circles[circleId];
        uint256 round = circle.currentRound;

        require(circle.status == CircleStatus.Active, "Circle not active");
        require(isParticipant[circleId][msg.sender], "Not a participant");
        require(!hasPaidRound[circleId][round][msg.sender], "Already paid this round");
        require(msg.value == circle.contributionAmount, "Incorrect contribution amount");

        hasPaidRound[circleId][round][msg.sender] = true;
        circle.paidCount += 1;

        emit RoundDeposit(circleId, round, msg.sender, msg.value);
    }

    /**
     * @notice Distribute the current round pool to the designated recipient.
     *         Callable when every member has deposited and either the round
     *         interval has elapsed (anyone) or the creator triggers early.
     */
    function payoutRound(uint256 circleId)
        external
        nonReentrant
        circleExists(circleId)
    {
        Circle storage circle = _circles[circleId];
        uint256 round = circle.currentRound;

        require(circle.status == CircleStatus.Active, "Circle not active");
        require(circle.paidCount == circle.participants.length, "Not all members paid");

        bool intervalElapsed = block.timestamp >= circle.roundStartTime + circle.roundInterval;
        require(intervalElapsed || msg.sender == circle.creator, "Interval not elapsed");

        address recipient = circle.participants[round];
        require(!hasReceivedPayout[circleId][recipient], "Recipient already paid out");

        uint256 poolAmount = circle.contributionAmount * circle.participants.length;

        // Effects before external interaction (checks-effects-interactions).
        hasReceivedPayout[circleId][recipient] = true;
        circle.paidCount = 0;

        if (round + 1 >= circle.totalRounds) {
            circle.status = CircleStatus.Completed;
            emit CircleCompleted(circleId);
        } else {
            circle.currentRound = round + 1;
            circle.roundStartTime = block.timestamp;
        }

        emit RoundPayout(circleId, round, recipient, poolAmount);

        (bool success, ) = recipient.call{value: poolAmount}("");
        require(success, "Payout transfer failed");
    }

    /**
     * @notice Cancel a circle that has not started yet. Refunds are not needed
     *         because no round deposits occur while status is Open.
     */
    function cancelCircle(uint256 circleId) external circleExists(circleId) {
        Circle storage circle = _circles[circleId];

        require(msg.sender == circle.creator, "Only creator");
        require(circle.status == CircleStatus.Open, "Cannot cancel");

        circle.status = CircleStatus.Cancelled;

        emit CircleCancelled(circleId, msg.sender);
    }

    // -------------------------------------------------------------------------
    // View functions
    // -------------------------------------------------------------------------

    function getCircle(uint256 circleId)
        external
        view
        circleExists(circleId)
        returns (
            address creator,
            uint256 contributionAmount,
            uint256 totalRounds,
            uint256 roundInterval,
            uint256 currentRound,
            uint256 roundStartTime,
            uint256 paidCount,
            CircleStatus status,
            uint256 participantCount
        )
    {
        Circle storage circle = _circles[circleId];
        return (
            circle.creator,
            circle.contributionAmount,
            circle.totalRounds,
            circle.roundInterval,
            circle.currentRound,
            circle.roundStartTime,
            circle.paidCount,
            circle.status,
            circle.participants.length
        );
    }

    function getParticipants(uint256 circleId)
        external
        view
        circleExists(circleId)
        returns (address[] memory)
    {
        return _circles[circleId].participants;
    }

    function getCurrentRecipient(uint256 circleId)
        external
        view
        circleExists(circleId)
        returns (address recipient)
    {
        Circle storage circle = _circles[circleId];
        require(circle.status == CircleStatus.Active, "Circle not active");
        return circle.participants[circle.currentRound];
    }

    function allMembersPaid(uint256 circleId) external view circleExists(circleId) returns (bool) {
        Circle storage circle = _circles[circleId];
        return circle.paidCount == circle.participants.length;
    }

    function canPayout(uint256 circleId) external view circleExists(circleId) returns (bool) {
        Circle storage circle = _circles[circleId];
        if (circle.status != CircleStatus.Active) return false;
        if (circle.paidCount != circle.participants.length) return false;
        return block.timestamp >= circle.roundStartTime + circle.roundInterval;
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    function _addParticipant(uint256 circleId, address participant) private {
        isParticipant[circleId][participant] = true;
        _circles[circleId].participants.push(participant);
    }

    function _startCircle(uint256 circleId) private {
        Circle storage circle = _circles[circleId];
        require(circle.status == CircleStatus.Open, "Already started");

        circle.status = CircleStatus.Active;
        circle.currentRound = 0;
        circle.roundStartTime = block.timestamp;
        circle.paidCount = 0;

        emit CircleStarted(circleId, circle.roundStartTime, circle.participants.length);
    }
}
