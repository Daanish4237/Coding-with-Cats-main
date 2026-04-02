<?php
session_start();
include("db_connect.php");

// Redirect if already logged in
if (isset($_SESSION['user_id'])) {
    header("Location: dashboard.php");
    exit();
}

$error_message   = "";
$success_message = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = mysqli_real_escape_string($dbconn, trim($_POST['username']));
    $password = $_POST['password'];

    $sql    = "SELECT * FROM users WHERE username = '$username'";
    $result = mysqli_query($dbconn, $sql);

    if ($result && mysqli_num_rows($result) > 0) {
        $user = mysqli_fetch_assoc($result);
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id']  = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role']     = $user['role'];
            $_SESSION['email']    = $user['email'];

            // Update last login timestamp
            mysqli_query($dbconn, "UPDATE users SET last_login = NOW() WHERE id = " . (int)$user['id']);

            // ── Change this redirect to home  ──
            header("Location: dashboard.php");
            exit();
        } else {
            $error_message = "Incorrect password.";
        }
    } else {
        $error_message = "No account found with that username.";
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login</title>
  <link rel="stylesheet" href="auth_style.css">
</head>
<body>
  <div class="blob blob1"></div>
  <div class="blob blob2"></div>
  <div class="blob blob3"></div>
  <div class="auth-card">

    <h1 class="auth-title">Welcome back</h1>
    <p class="auth-subtitle">Sign in to your account</p>

    <?php if ($error_message): ?>
      <div class="alert alert-danger"><?php echo htmlspecialchars($error_message); ?></div>
    <?php endif; ?>

    <?php if ($success_message): ?>
      <div class="alert alert-success"><?php echo htmlspecialchars($success_message); ?></div>
    <?php endif; ?>

    <form method="POST" action="">
      <div class="form-group">
        <label for="username">Username</label>
        <input id="username" name="username" type="text" placeholder="Enter your username" required autocomplete="username">
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <div class="input-wrap">
          <input id="password" name="password" type="password" placeholder="Enter your password" required autocomplete="current-password">
          <button type="button" class="toggle-pw" onclick="togglePassword('password')" aria-label="Toggle password visibility">👁️</button>
        </div>
      </div>

      <button type="submit" class="btn">Sign In</button>
    </form>

    <p class="auth-switch">Don't have an account? <a href="register.php">Register</a></p>

  </div>

  <script>
    function togglePassword(id) {
      const input = document.getElementById(id);
      const btn   = input.nextElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁️';
      }
    }
    // Tiled paw print wallpaper 
    const PAW_COLORS = [
      'rgba(101,55,28,OP)',
      'rgba(120,75,45,OP)',
      'rgba(155,100,60,OP)',
      'rgba(85,50,25,OP)',
      'rgba(140,90,50,OP)',
    ];

    function makePawSVG(colorIdx, opacity, flip) {
      const col = PAW_COLORS[colorIdx % PAW_COLORS.length].replace(/OP/g, opacity);
      const mir = flip ? 'scale(-1,1) translate(-80,0)' : '';
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 90" width="55" height="63">
        <g transform="${mir}">
          <path d="M40,78 C22,78 18,66 18,58 C18,47 25,40 40,40 C55,40 62,47 62,58 C62,66 58,78 40,78 Z" fill="${col}"/>
          <ellipse cx="11" cy="33" rx="10" ry="12" fill="${col}"/>
          <ellipse cx="69" cy="33" rx="10" ry="12" fill="${col}"/>
          <ellipse cx="30" cy="20" rx="9"  ry="11" fill="${col}"/>
          <ellipse cx="50" cy="20" rx="9"  ry="11" fill="${col}"/>
        </g>
      </svg>`;
    }

    function spawnPawWallpaper() {
      const cols   = Math.ceil(window.innerWidth  / 100) + 1;
      const rows   = Math.ceil(window.innerHeight / 110) + 1;
      let idx = 0;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const el = document.createElement('div');
          el.className = 'paw-print stamp';

          // offset every other row 
          const offsetX = (row % 2 === 0) ? 0 : 50;
          const x = col * 100 + offsetX;
          const y = row * 110;

          const rotation = (Math.random() * 60) - 30;
          const opacity  = 0.55 + Math.random() * 0.35;
          const colorIdx = (row * cols + col) % PAW_COLORS.length;
          const flip     = Math.random() > 0.5;
          const delay    = (row * cols + col) * 35;

          el.style.cssText = `left:${x}px; top:${y}px; --r:${rotation}deg; --fo:${opacity}; opacity:0; animation-delay:${delay}ms;`;
          el.innerHTML = makePawSVG(colorIdx, opacity, flip);
          document.body.appendChild(el);

          // staggered stamp-in
          setTimeout(() => {
            el.style.opacity = '0';
            requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('stamp')));
          }, delay);

          idx++;
        }
      }
    }

    spawnPawWallpaper();
  </script>
</body>
</html>