<?php
// Quiz-project/get_leaderboard.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Prevent accidental output (whitespace/BOM) before JSON.
if (ob_get_length()) ob_end_clean();
ob_start();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't display errors directly, we'll return them as JSON

// Include database connection - use relative path
$db_path = dirname(__DIR__) . '/database/db_connect.php';

if (!file_exists($db_path)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection file not found']);
    exit;
}

require_once $db_path;

// Check if connection exists
if (!isset($conn) || !$conn) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to connect to database: ' . mysqli_connect_error()]);
    exit;
}

// Get stage ID from query parameter
$stage_id = isset($_GET['stage']) ? (int)$_GET['stage'] : null;

if (!$stage_id) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing stage parameter']);
    exit;
}

if ($stage_id < 1 || $stage_id > 15) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid stage ID. Must be 1-15']);
    exit;
}

// Check if table exists
$table_check = mysqli_query($conn, "SHOW TABLES LIKE 'leaderboards'");
if (!$table_check || mysqli_num_rows($table_check) == 0) {
    http_response_code(500);
    echo json_encode(['error' => 'Leaderboards table does not exist. Please run the database setup script.']);
    exit;
}

// Query to get top scores for this stage
$query = "SELECT student_id, score, stage_id, rank, recordedAt 
          FROM leaderboards 
          WHERE stage_id = " . (int)$stage_id . " 
          ORDER BY score DESC 
          LIMIT 10";

$result = mysqli_query($conn, $query);

if (!$result) {
    http_response_code(500);
    echo json_encode(['error' => 'Database query failed: ' . mysqli_error($conn)]);
    exit;
}

$leaderboard = [];
while ($row = mysqli_fetch_assoc($result)) {
    $leaderboard[] = $row;
}

mysqli_close($conn);

// Return the leaderboard data
echo json_encode($leaderboard);
?>