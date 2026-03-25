<?php
// database/check-auth.php
session_start();
header('Content-Type: application/json');

$response = [
    'authenticated' => isset($_SESSION['authenticated']) && $_SESSION['authenticated'] === true,
    'username' => $_SESSION['username'] ?? null,
    'user_id' => $_SESSION['user_id'] ?? null
];

echo json_encode($response);
?>