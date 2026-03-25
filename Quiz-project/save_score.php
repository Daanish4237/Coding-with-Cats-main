<?php
// Quiz-project/save_score.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Use absolute path via dirname to locate the database folder
$db_path = dirname(__DIR__) . '/database/db_connect.php';

// Debug: Log file path
error_log("Looking for db at: " . $db_path);

if (!file_exists($db_path)) {
    echo json_encode(['error' => 'Database connection file not found at: ' . $db_path]);
    exit;
}

require_once $db_path;

// Check if connection exists
if (!isset($conn) || !$conn) {
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Get POST data
$input = json_decode(file_get_contents('php://input'), true);

// Debug: Log received data
error_log("Received data: " . print_r($input, true));

$student_id = mysqli_real_escape_string($conn, $input['student_id'] ?? '');
$stage_id = (int)($input['stage_id'] ?? 0);
$score = (int)($input['score'] ?? 0);

// Validate input
if (empty($student_id)) {
    echo json_encode(['error' => 'Student ID is required']);
    exit;
}

if ($stage_id < 1 || $stage_id > 15) {
    echo json_encode(['error' => 'Invalid level. Must be between 1 and 15']);
    exit;
}

if ($score < 0) {
    echo json_encode(['error' => 'Invalid score']);
    exit;
}

// Check if student exists
$checkStudent = "SELECT student_id FROM students WHERE student_id = '$student_id'";
$result = mysqli_query($conn, $checkStudent);

if (!$result) {
    echo json_encode(['error' => 'Student query failed: ' . mysqli_error($conn)]);
    exit;
}

if (mysqli_num_rows($result) == 0) {
    // Student doesn't exist, create a new student record
    $insertStudent = "INSERT INTO students (student_id, username, totalPoints) 
                      VALUES ('$student_id', '$student_id', 0)";
    if (!mysqli_query($conn, $insertStudent)) {
        echo json_encode(['error' => 'Failed to create student: ' . mysqli_error($conn)]);
        exit;
    }
}

// Check if leaderboards table exists
$tableCheck = mysqli_query($conn, "SHOW TABLES LIKE 'leaderboards'");
if (mysqli_num_rows($tableCheck) == 0) {
    echo json_encode(['error' => 'Leaderboards table does not exist']);
    exit;
}

// Generate leaderboard ID
$leaderboard_id = uniqid('lb_', true);
$leaderboard_id_escaped = mysqli_real_escape_string($conn, $leaderboard_id);

// Calculate rank
$rankQuery = "SELECT COUNT(*) + 1 as rank 
              FROM leaderboards 
              WHERE stage_id = $stage_id AND score > $score";
$rankResult = mysqli_query($conn, $rankQuery);

if (!$rankResult) {
    echo json_encode(['error' => 'Rank query failed: ' . mysqli_error($conn)]);
    exit;
}

$rankRow = mysqli_fetch_assoc($rankResult);
$rank = $rankRow['rank'] ?? 1;

// Insert new score
$insertQuery = "INSERT INTO leaderboards 
                (leaderboard_id, student_id, stage_id, score, rank, recordedAt) 
                VALUES ('$leaderboard_id_escaped', '$student_id', $stage_id, $score, $rank, NOW())";

if (mysqli_query($conn, $insertQuery)) {
    echo json_encode([
        'success' => true,
        'message' => 'Score saved successfully',
        'rank' => $rank,
        'stage_id' => $stage_id
    ]);
} else {
    echo json_encode(['error' => 'Failed to save score: ' . mysqli_error($conn)]);
}

mysqli_close($conn);
?>