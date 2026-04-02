<?php
// ──────────────────────────────────────────────
//  Database Connection
//  Edit these values to match your environment.
// ──────────────────────────────────────────────
$db_servername = "localhost";
$db_username   = "root";   // your DB username
$db_password   = "";       // your DB password
$db_name       = "coding_with_cats";  // your DB name

$dbconn = mysqli_connect($db_servername, $db_username, $db_password, $db_name);

if (!$dbconn) {
    die('<p style="color:red;font-family:sans-serif;padding:20px;">
         Database connection failed: ' . mysqli_connect_error() . '</p>');
}

mysqli_set_charset($dbconn, "utf8mb4");
?>
