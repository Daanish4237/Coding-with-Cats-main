/**
 * MainHub.js — Phaser Scene for the world map / level selection hub.
 *
 * Renders World 1–3 banners and level buttons (1–15) as interactive Phaser
 * Text objects.  Auth state is fetched from GET /api/auth/check and displayed
 * as plain Phaser Text UI elements inside the scene.
 *
 * Requirements: 16.1, 16.2, 16.5
 */

export class MainHub extends Phaser.Scene {

    constructor() {
        super('MainHub');
    }

    // ─── preload ────────────────────────────────────────────────────────────

    preload() {
        // Background music (ogg with mp3 fallback)
        if (!this.cache.audio.exists('bg_music')) {
            this.load.audio('bg_music', [
                'assets/audio/bg_music.ogg',
                'assets/audio/bg_music.mp3'
            ]);
        }
    }

    // ─── create ─────────────────────────────────────────────────────────────

    create() {
        const W = this.scale.width;    // 1280
        const H = this.scale.height;   // 720

        // ── Background gradient via Graphics ──────────────────────────────
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x667eea, 0x667eea, 0x764ba2, 0x764ba2, 1);
        bg.fillRect(0, 0, W, H);

        // ── Title ─────────────────────────────────────────────────────────
        this.add.text(W / 2, 36, '🌟 Code Quest — Coding with Cats 🌟', {
            fontSize: '26px',
            fontFamily: 'Segoe UI, Tahoma, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold',
        }).setOrigin(0.5, 0.5);

        // ── Auth UI ───────────────────────────────────────────────────────
        this._buildAuthUI(W);

        // ── World / level layout ──────────────────────────────────────────
        this._buildWorldMap(W);

        // ── Background music ──────────────────────────────────────────────
        this._startMusic();

        // ── Fetch auth state ──────────────────────────────────────────────
        this._checkAuth();
    }

    // ─── Auth UI ─────────────────────────────────────────────────────────────

    _buildAuthUI(W) {
        // Placeholder texts — updated once /api/auth/check responds
        this._authText = this.add.text(W - 20, 36, '', {
            fontSize: '16px',
            fontFamily: 'Segoe UI, sans-serif',
            color: '#ffffff',
        }).setOrigin(1, 0.5);

        // Login button (shown when not authenticated)
        this._loginBtn = this._makeButton(W - 160, 36, '🔐 Login', '#2196F3', () => {
            window.location.href = '/login.html';
        });

        // Register button
        this._registerBtn = this._makeButton(W - 60, 36, '📝 Register', '#4CAF50', () => {
            window.location.href = '/register.html';
        });

        // Logout button (shown when authenticated)
        this._logoutBtn = this._makeButton(W - 60, 36, '🚪 Logout', '#f44336', async () => {
            try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (_) {}
            window.location.reload();
        });
        this._logoutBtn.setVisible(false);
    }

    _makeButton(x, y, label, bgHex, onClick) {
        const btn = this.add.text(x, y, label, {
            fontSize: '15px',
            fontFamily: 'Segoe UI, sans-serif',
            color: '#ffffff',
            backgroundColor: bgHex,
            padding: { x: 12, y: 6 },
            borderRadius: 20,
        })
            .setOrigin(0.5, 0.5)
            .setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setAlpha(0.85));
        btn.on('pointerout',  () => btn.setAlpha(1));
        btn.on('pointerdown', onClick);
        return btn;
    }

    // ─── World map ───────────────────────────────────────────────────────────

    _buildWorldMap(W) {
        // Level data: [levelNumber, displayName, difficulty, href]
        const worlds = [
            {
                title: '🌍 World 1: Blocky Basics',
                color: '#4CAF50',
                levels: [
                    [1,  'Printing Text',        '📘 Beginner',     './src/world1/lvl1/lvl1.html'],
                    [2,  'Python Variables',      '📘 Beginner',     './src/world1/lvl2/lvl2.html'],
                    [3,  'Data Types',            '📘 Beginner',     './src/world1/lvl3/lvl3.html'],
                    [4,  'Input Functions',       '📘 Beginner',     './src/world1/lvl4/lvl4.html'],
                    [5,  'Boss: Code Cat!',       '⚔️ Boss',         './src/world1/lvl5/lvl5.html', true],
                ],
            },
            {
                title: '⚡ World 2: Advanced Logic',
                color: '#2196F3',
                levels: [
                    [6,  'Conditional Statements','🚀 Intermediate', './src/world2/lvl1/lvl1.html'],
                    [7,  'While Loops',           '🚀 Intermediate', './src/world2/lvl2/lvl2.html'],
                    [8,  'For Loops',             '🚀 Intermediate', './src/world2/lvl3/lvl3.html'],
                    [9,  'Lists and Tuples',      '🚀 Advanced',     './src/world2/lvl4/lvl4.html'],
                    [10, 'Boss: Logic Master',    '⚔️ Boss',         './src/world2/lvl5/lvl5.html', true],
                ],
            },
            {
                title: '🌟 World 3: Master Challenges',
                color: '#ff9800',
                levels: [
                    [11, 'Dictionaries & Sets',  '🔥 Advanced',     './src/world3/lvl1/lvl1.html'],
                    [12, 'Functions',            '🔥 Advanced',     './src/world3/lvl2/lvl2.html'],
                    [13, 'Classes & Objects',    '🔥 Advanced',     './src/world3/lvl3/lvl3.html'],
                    [14, 'Inheritance',          '🔥 Advanced',     './src/world3/lvl4/lvl4.html'],
                    [15, 'Final Boss: Ultimate', '⚔️ Boss',         './src/world3/lvl5/lvl5.html', true],
                ],
            },
        ];

        // Store boss button refs for lock/unlock
        this._bossButtons = {};

        const startY = 90;
        const worldSpacingY = 200;
        const cardW = 200;
        const cardH = 80;
        const cardGapX = 20;
        const levelsPerRow = 5;

        worlds.forEach((world, wi) => {
            const worldY = startY + wi * worldSpacingY;

            // World title banner
            const bannerBg = this.add.graphics();
            bannerBg.fillStyle(0xffffff, 0.15);
            bannerBg.fillRoundedRect(20, worldY, W - 40, 30, 8);

            this.add.text(W / 2, worldY + 15, world.title, {
                fontSize: '20px',
                fontFamily: 'Segoe UI, sans-serif',
                color: world.color,
                fontStyle: 'bold',
            }).setOrigin(0.5, 0.5);

            // Level buttons
            const totalRowW = levelsPerRow * cardW + (levelsPerRow - 1) * cardGapX;
            const rowStartX = (W - totalRowW) / 2;

            world.levels.forEach(([num, name, , href, isBoss], li) => {
                const cx = rowStartX + li * (cardW + cardGapX) + cardW / 2;
                const cy = worldY + 55 + cardH / 2;

                const cardBg = this.add.graphics();
                const bgColor = isBoss ? 0xff6b35 : 0xffffff;
                const bgAlpha = isBoss ? 0.9 : 0.2;
                cardBg.fillStyle(bgColor, bgAlpha);
                cardBg.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 10);

                const numLabel = isBoss ? `👑 ${num}` : `${num}`;
                const textColor = isBoss ? '#ffffff' : '#ffffff';

                const numText = this.add.text(cx, cy - 14, numLabel, {
                    fontSize: '22px',
                    fontFamily: 'Segoe UI, sans-serif',
                    color: textColor,
                    fontStyle: 'bold',
                }).setOrigin(0.5, 0.5);

                const nameText = this.add.text(cx, cy + 12, name, {
                    fontSize: '11px',
                    fontFamily: 'Segoe UI, sans-serif',
                    color: isBoss ? '#ffe0cc' : '#ddddff',
                    wordWrap: { width: cardW - 10 },
                    align: 'center',
                }).setOrigin(0.5, 0.5);

                // Invisible hit area for the whole card
                const hitZone = this.add.zone(cx, cy, cardW, cardH)
                    .setInteractive({ useHandCursor: true });

                // Hover tween — scale up
                hitZone.on('pointerover', () => {
                    this.tweens.add({
                        targets: [cardBg, numText, nameText],
                        scaleX: 1.08,
                        scaleY: 1.08,
                        duration: 120,
                        ease: 'Power1',
                    });
                });

                hitZone.on('pointerout', () => {
                    this.tweens.add({
                        targets: [cardBg, numText, nameText],
                        scaleX: 1,
                        scaleY: 1,
                        duration: 120,
                        ease: 'Power1',
                    });
                });

                hitZone.on('pointerdown', () => {
                    // Boss levels check lock state before navigating
                    if (isBoss && this._bossButtons[num] && this._bossButtons[num].locked) {
                        return; // locked — do nothing
                    }
                    window.location.href = href;
                });

                // Store boss button refs
                if (isBoss) {
                    this._bossButtons[num] = {
                        locked: true, // default locked until auth check
                        cardBg,
                        numText,
                        nameText,
                        hitZone,
                        href,
                        lockOverlay: null,
                    };
                    // Add lock overlay text
                    const lockText = this.add.text(cx, cy + 28, '🔒 Locked', {
                        fontSize: '11px',
                        fontFamily: 'Segoe UI, sans-serif',
                        color: '#ffcccc',
                    }).setOrigin(0.5, 0.5);
                    this._bossButtons[num].lockText = lockText;
                }
            });
        });

        // Leaderboard link at the bottom
        const lbY = startY + worlds.length * worldSpacingY + 10;
        const lbBtn = this._makeButton(W / 2, lbY, '🏆 View Global Leaderboard 🏆', '#ff5722', () => {
            window.location.href = './Quiz-project/leaderboard.html';
        });
        lbBtn.setFontSize('18px');
    }

    // ─── Boss lock/unlock ────────────────────────────────────────────────────

    _lockBoss(num) {
        const b = this._bossButtons[num];
        if (!b) return;
        b.locked = true;
        b.cardBg.setAlpha(0.5);
        if (b.lockText) b.lockText.setVisible(true);
    }

    _unlockBoss(num) {
        const b = this._bossButtons[num];
        if (!b) return;
        b.locked = false;
        b.cardBg.setAlpha(0.9);
        if (b.lockText) b.lockText.setVisible(false);
    }

    // ─── Auth check ──────────────────────────────────────────────────────────

    async _checkAuth() {
        try {
            const res  = await fetch('/api/auth/check');
            const data = await res.json();

            if (data.authenticated) {
                // Show welcome + logout
                this._loginBtn.setVisible(false);
                this._registerBtn.setVisible(false);
                this._logoutBtn.setVisible(true);
                this._authText.setText(`🐱 ${data.username}`);

                // Check boss level prerequisites
                await this._checkBossLocks(data.student_id);
            } else {
                // Show login / register
                this._loginBtn.setVisible(true);
                this._registerBtn.setVisible(true);
                this._logoutBtn.setVisible(false);
                // Keep boss levels locked
                this._lockBoss(10);
                this._lockBoss(15);
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        }
    }

    async _checkBossLocks(studentId) {
        try {
            const [lb9, lb14] = await Promise.all([
                fetch('/api/leaderboard?stage=9').then(r => r.json()).catch(() => []),
                fetch('/api/leaderboard?stage=14').then(r => r.json()).catch(() => []),
            ]);

            const hasStage9  = Array.isArray(lb9)  && lb9.some(e => e.student_id === studentId);
            const hasStage14 = Array.isArray(lb14) && lb14.some(e => e.student_id === studentId);

            if (hasStage9)  this._unlockBoss(10); else this._lockBoss(10);
            if (hasStage14) this._unlockBoss(15); else this._lockBoss(15);
        } catch (err) {
            console.error('Boss lock check failed:', err);
        }
    }

    // ─── Music ───────────────────────────────────────────────────────────────

    _startMusic() {
        const muted = localStorage.getItem('cwc_muted') === 'true';

        // Only play if the audio key was loaded successfully
        if (!this.cache.audio.exists('bg_music')) return;

        if (!this.sound.get('bg_music')) {
            const music = this.sound.add('bg_music', { loop: true, volume: 0.5 });
            if (!muted) {
                // Phaser requires a user gesture before AudioContext can start;
                // attempt play and fall back to a one-time click listener.
                const tryPlay = () => {
                    music.play();
                    this.input.off('pointerdown', tryPlay);
                };
                try {
                    music.play();
                } catch (_) {
                    this.input.once('pointerdown', tryPlay);
                }
            }
        }
    }
}
