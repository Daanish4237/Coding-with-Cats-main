<?php
// Quiz-project/test_db.php
require_once '../database/db_connect.php';

echo "<h2>Database Test</h2>";

if ($conn) {
    echo "✅ Database connected successfully!<br>";
    echo "Database: coding_with_cats<br>";
    
    // Check if leaderboards table exists
    $result = mysqli_query($conn, "SHOW TABLES LIKE 'leaderboards'");
    if (mysqli_num_rows($result) > 0) {
        echo "✅ 'leaderboards' table exists<br>";
        
        // Count records
        $count_result = mysqli_query($conn, "SELECT COUNT(*) as total FROM leaderboards");
        $count = mysqli_fetch_assoc($count_result);
        echo "📊 Total records in leaderboards: " . $count['total'] . "<br>";
        
        // Show recent scores
        $scores = mysqli_query($conn, "SELECT * FROM leaderboards LIMIT 5");
        echo "<h3>Recent Scores:</h3>";
        echo "<table border='1' cellpadding='5'>";
        echo "<tr><th>Student ID</th><th>Stage</th><th>Score</th><th>Rank</th><th>Date</th></tr>";
        while ($row = mysqli_fetch_assoc($scores)) {
            echo "<tr>";
            echo "<td>" . $row['student_id'] . "</td>";
            echo "<td>" . $row['stage_id'] . "</td>";
            echo "<td>" . $row['score'] . "</td>";
            echo "<td>" . $row['rank'] . "</td>";
            echo "<td>" . $row['recordedAt'] . "</td>";
            echo "</tr>";
        }
        echo "</table>";
    } else {
        echo "❌ 'leaderboards' table does NOT exist<br>";
        echo "Please create it using phpMyAdmin with this SQL:<br>";
        echo "<pre>
CREATE TABLE leaderboards (
    leaderboard_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL,
    stage_id INT NOT NULL,
    score INT NOT NULL,
    rank INT,
    recordedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (stage_id),
    INDEX (score)
);
        </pre>";
    }
} else {
    echo "❌ Database connection failed<br>";
}
?>