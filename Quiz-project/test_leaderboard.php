<?php
// Quick test script
header('Content-Type: application/json');

echo json_encode(['message' => 'Test started']);

// Test 1: Check database connection
echo "\n<!-- Test 1: Connecting to database -->\n";
$db_path = dirname(__DIR__) . '/database/db_connect.php';
echo "<!-- DB Path: $db_path -->\n";

if (!file_exists($db_path)) {
    echo json_encode(['error' => 'Database file not found at: ' . $db_path]);
    exit;
}

require_once $db_path;

if (!isset($conn) || !$conn) {
    echo json_encode(['error' => 'Connection failed: ' . mysqli_connect_error()]);
    exit;
}

echo "<!-- Connection successful -->\n";

// Test 2: Check if leaderboards table exists
$table_check = mysqli_query($conn, "SHOW TABLES LIKE 'leaderboards'");
if (!$table_check) {
    echo json_encode(['error' => 'Query failed: ' . mysqli_error($conn)]);
    exit;
}

if (mysqli_num_rows($table_check) == 0) {
    echo json_encode(['error' => 'Leaderboards table does not exist']);
    exit;
}

echo "<!-- Leaderboards table exists -->\n";

// Test 3: Try a simple query
$test_query = "SELECT * FROM leaderboards LIMIT 1";
$result = mysqli_query($conn, $test_query);

if (!$result) {
    echo json_encode(['error' => 'Query error: ' . mysqli_error($conn)]);
    exit;
}

$row_count = mysqli_num_rows($result);
echo json_encode([
    'success' => true,
    'message' => 'All tests passed',
    'row_count' => $row_count
]);

mysqli_close($conn);
?>
