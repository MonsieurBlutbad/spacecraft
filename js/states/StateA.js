function Enemy () {
/*    this.name = 'Enemy Prototype';
    this.launchTimer = 1000;
    this.group = undefined;
    this.damage = 20;
    this.minSpacing = 300;
    this.maxSpacing = 3000;
    this.speed = 300;*/
}

Enemy.prototype = {

    preload: function() {
    },

    launch: function () {
        var enemy = this.group.getFirstExists(false);
        if (enemy) {
            enemy.reset(game.width + 20, game.rnd.integerInRange(0, game.height));
            enemy.body.velocity.y = game.rnd.integerInRange(-150, 150);
            enemy.body.velocity.x = -this.speed;
            enemy.body.drag.y = 100;
            enemy.trail.start(false, 800, 1);
            enemy.update = function () {
                enemy.angle = 180 - game.math.radToDeg(Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y));
                enemy.trail.x = enemy.x + 10;
                enemy.trail.y = enemy.y;
                //  Kill enemies once they go off screen
                if (enemy.x < -200) {
                    enemy.kill();
                }
            };
        }

        //  Send another enemies soon
        game.time.events.add(game.rnd.integerInRange(this.minSpacing, this.maxSpacing), this.launch, this);    }
};

Enemy.prototype.name = 'Enemy Prototype';

function GreenEnemy() {
}

GreenEnemy.prototype = Enemy.prototype;

var e = new Enemy();
var g = new GreenEnemy();



var States = {};

var ACCELERATION = 600;
var DRAG = 400;
var MAXSPEED = 400;

var player;

var weapon = {
    laser: {
        button: undefined,
        speed: 400,
        rate: 250,
        timer: 0,
        fireFunction: undefined
    }
};

var enemies = {};

var cursors;

var spaceship;

var bullets = {};

var explosions;

var shields;

States.Level_01 = function (game) {
    this.background;
    this.bank;
};

States.Level_01.prototype = {

    init: function () {
        weapon.laser.fireFunction = this.fireLaser;

        game.renderer.renderSession.roundPixels = true;
        this.physics.startSystem(Phaser.Physics.ARCADE);
    },

    preload: function () {
        game.time.advancedTiming = true;

        this.load.image('background', 'assets/sprites/backgrounds/starfield.jpg');

        this.load.image('laser', 'assets/sprites/spaceship/laser-01.png');
        this.load.image('beam','assets/sprites/spaceship/beam-01.png');
        this.load.image('engine', 'assets/sprites/spaceship/engine-01.png');
        this.load.image('cockpit', 'assets/sprites/spaceship/cockpit-01.png');

        this.load.image('enemy-green', 'assets/sprites/enemies/enemy-01.png');

        this.load.image('bullet-laser', 'assets/sprites/bullets/laser-01.png');

        this.load.spritesheet('explosion', 'assets/sprites/explosions/explode.png', 128, 128);
    },

    create: function () {
        var self = this;

        this.background = game.add.tileSprite(0, 0, 800, 600, 'background');

        spaceship = this.add.sprite(100, 332, 'cockpit');
        spaceship.health = 100;
        spaceship.engine = spaceship.addChild(this.make.sprite(-64, 0, 'engine'));
        spaceship.laser = spaceship.addChild(this.make.sprite(0, -64, 'laser'));
        spaceship.beam = spaceship.addChild(this.make.sprite(0, 64, 'beam'));
        game.physics.enable(spaceship, Phaser.Physics.ARCADE);
        spaceship.body.maxVelocity.setTo(MAXSPEED, MAXSPEED);
        spaceship.body.drag.setTo(DRAG, DRAG);
        spaceship.scale.setTo(1, 1);
        spaceship.anchor.setTo(0.5, 0.5);
        spaceship.children.forEach( function(child) {
            child.anchor.setTo(0.5,0.5);
        });
        spaceship.events.onKilled.add(function(){
            spaceship.engine.shipTrail.kill();
        });

        //  Add an emitter for the ship's trail
        spaceship.engine.shipTrail = game.add.emitter(spaceship.engine.world.x - spaceship.engine.width, spaceship.engine.world.y, 400);
        spaceship.engine.shipTrail.width = 10;
        spaceship.engine.shipTrail.makeParticles('bullet-laser');
        spaceship.engine.shipTrail.setXSpeed(-200, -180);
        spaceship.engine.shipTrail.setYSpeed(30, -30);
        spaceship.engine.shipTrail.setRotation(50,-50);
        spaceship.engine.shipTrail.setAlpha(1, 0.01, 800);
        spaceship.engine.shipTrail.setScale(0.05, 0.4, 0.05, 0.4, 2000, Phaser.Easing.Quintic.Out);
        spaceship.engine.shipTrail.start(false, 5000, 10);

        //  Our laser bullet group
        bullets.laser = game.add.group();
        bullets.laser.enableBody = true;
        bullets.laser.physicsBodyType = Phaser.Physics.ARCADE;
        bullets.laser.createMultiple(30, 'bullet-laser');
        bullets.laser.setAll('anchor.x', 0.5);
        bullets.laser.setAll('anchor.y', 1);
        bullets.laser.setAll('outOfBoundsKill', true);
        bullets.laser.setAll('checkWorldBounds', true);

        //  An explosion pool
        explosions = game.add.group();
        explosions.enableBody = true;
        explosions.physicsBodyType = Phaser.Physics.ARCADE;
        explosions.createMultiple(30, 'explosion');
        explosions.setAll('anchor.x', 0.5);
        explosions.setAll('anchor.y', 0.5);
        explosions.forEach( function(explosion) {
            explosion.animations.add('explosion');
        });

        //  The baddies!
        enemies.green = game.add.group();
        enemies.green.enableBody = true;
        enemies.green.physicsBodyType = Phaser.Physics.ARCADE;
        enemies.green.createMultiple(5, 'enemy-green');
        enemies.green.setAll('anchor.x', 0.5);
        enemies.green.setAll('anchor.y', 0.5);
        enemies.green.setAll('scale.x', 0.5);
        enemies.green.setAll('scale.y', 0.5);
        enemies.green.setAll('angle', 180);
        enemies.green.setAll('outOfBoundsKill', true);
        enemies.green.setAll('checkWorldBounds', true);
        enemies.green.forEach(function(enemy){
            enemy.damageAmount = 20;
            self.addEnemyEmitterTrail(enemy);
            enemy.body.setSize(enemy.width *.75, enemy.height *.75);
            enemy.events.onKilled.add(function(){
                enemy.trail.kill();
            });
        });
        this.launchGreenEnemy();

        //  Shields stat
        shields = game.add.text(game.world.width - 150, 10, 'Shields: ' + spaceship.health +'%', { font: '20px Arial', fill: '#fff' });
        shields.render = function () {
            shields.text = 'Shields: ' + Math.max(spaceship.health, 0) +'%';
        };

        cursors = game.input.keyboard.createCursorKeys();
        weapon.laser.button = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    },

    update: function () {
        var self = this;

        //  Scroll the background
        this.background.tilePosition.x -= 2;

        spaceship.body.acceleration.setTo(0, 0);

        // Horizontal Movement
        if(cursors.left.isDown || game.input.keyboard.isDown(Phaser.Keyboard.A)) {
            spaceship.body.acceleration.x = -ACCELERATION;
        } else if(cursors.right.isDown || game.input.keyboard.isDown(Phaser.Keyboard.D)) {
            spaceship.body.acceleration.x = ACCELERATION;
        }

        // Vertical Movement
        if(cursors.up.isDown || game.input.keyboard.isDown(Phaser.Keyboard.W)) {
            spaceship.body.acceleration.y = -ACCELERATION;
        } else if(cursors.down.isDown || game.input.keyboard.isDown(Phaser.Keyboard.S)) {
            spaceship.body.acceleration.y = ACCELERATION;
        }

        // Shoot Laser
        if (spaceship.alive && weapon.laser.button.isDown) {
            weapon.laser.fireFunction();
        }

        //  Stop at screen edges
        if (spaceship.x > game.width - 50) {
            spaceship.x = game.width - 50;
            spaceship.body.acceleration.x = 0;
        }
        if (spaceship.x < 50) {
            spaceship.x = 50;
            spaceship.body.acceleration.x = 0;
        }
        if (spaceship.y > game.height - 50) {
            spaceship.y = game.height - 50;
            spaceship.body.acceleration.y = 0;
        }
        if (spaceship.y < 50) {
            spaceship.y = 50;
            spaceship.body.acceleration.y = 0;
        }

        //  Squish and rotate ship for illusion of "banking"
        this.bank = spaceship.body.velocity.y / MAXSPEED;
        spaceship.scale.y = 1 - (Math.abs(this.bank) / 8);
        spaceship.angle = this.bank * 4;

        spaceship.engine.shipTrail.x =  spaceship.engine.world.x - spaceship.engine.width;
        spaceship.engine.shipTrail.y =  spaceship.engine.world.y;

        // Check collisions
        game.physics.arcade.overlap(spaceship, enemies.green, this.shipCollide, null, this);
        spaceship.children.forEach( function(child) {
            game.physics.arcade.overlap(child, enemies.green, self.shipPartCollide, null, self);
        });
        game.physics.arcade.overlap(enemies.green, bullets.laser, this.hitEnemy, null, this);

    },

    render: function()
    {
        game.debug.text(game.time.fps || '--', 2, 14, "#00ff00");
    /*    for (var i = 0; i < enemies.green.length; i++){
            game.debug.body(enemies.green.children[i]);
        }
        game.debug.body(spaceship);
        spaceship.children.forEach( function(child) {
            game.debug.body(child)
        });*/
    },

    fireLaser: function () {
        //  To avoid them being allowed to fire too fast we set a time limit
        if (game.time.now > weapon.laser.timer) {
            //  Grab the first bullet we can from the pool
            var bullet = bullets.laser.getFirstExists(false);

            if (bullet)
            {
                //  And fire it
                //  Make bullet come out of tip of ship with right angle
                var bulletOffset = 20 * Math.sin(game.math.degToRad(spaceship.angle));
                bullet.reset(spaceship.laser.world.x + bulletOffset, spaceship.laser.world.y);
                bullet.angle = spaceship.angle;
                game.physics.arcade.velocityFromAngle(bullet.angle, weapon.laser.speed, bullet.body.velocity);
                bullet.body.velocity.y += spaceship.body.velocity.y;

                weapon.laser.timer = game.time.now + weapon.laser.rate;
            }
        }
    },

    launchGreenEnemy: function() {
        var MIN_ENEMY_SPACING = 300;
        var MAX_ENEMY_SPACING = 3000;
        var ENEMY_SPEED = 300;

        var enemy = enemies.green.getFirstExists(false);
        if (enemy) {
            enemy.reset(game.width + 20, game.rnd.integerInRange(0, game.height));
            enemy.body.velocity.y = game.rnd.integerInRange(-150, 150);
            enemy.body.velocity.x = -ENEMY_SPEED;
            enemy.body.drag.y = 100;
            enemy.trail.start(false, 800, 1);
            enemy.update = function () {
                enemy.angle = 180 - game.math.radToDeg(Math.atan2(enemy.body.velocity.x, enemy.body.velocity.y));
                enemy.trail.x = enemy.x + 10;
                enemy.trail.y = enemy.y;
                //  Kill enemies once they go off screen
                if (enemy.x < -200) {
                    enemy.kill();
                }
            };
        }

        //  Send another enemies soon
        game.time.events.add(game.rnd.integerInRange(MIN_ENEMY_SPACING, MAX_ENEMY_SPACING), this.launchGreenEnemy, this);
    },

    addEnemyEmitterTrail: function(enemy) {
        var enemyTrail = game.add.emitter(enemy.x + 10, enemy.y, 100);
        enemyTrail.width = 10;
        enemyTrail.makeParticles('explosion', [1,2,3,4,5]);
        enemyTrail.setXSpeed(20, -20);
        enemyTrail.setRotation(50,-50);
        enemyTrail.setAlpha(0.4, 0, 800);
        enemyTrail.setScale(0.01, 0.1, 0.01, 0.1, 1000, Phaser.Easing.Quintic.Out);
        enemy.trail = enemyTrail;
    },

    shipCollide: function(spaceship, enemy) {
        var explosion = explosions.getFirstExists(false);
        explosion.reset(enemy.body.x + enemy.body.halfWidth, enemy.body.y + enemy.body.halfHeight);
        explosion.body.velocity.y = enemy.body.velocity.y;
        explosion.alpha = 0.7;
        explosion.play('explosion', 30, false, true);
        enemy.kill();
        spaceship.damage(enemy.damageAmount);
        shields.render();
    },

    shipPartCollide: function(part, enemy) {
        this.shipCollide(part.parent, enemy);
    },

    hitEnemy: function(enemy, bullet) {
        var explosion = explosions.getFirstExists(false);
        explosion.reset(bullet.body.x + bullet.body.halfWidth, bullet.body.y + bullet.body.halfHeight);
        explosion.body.velocity.y = enemy.body.velocity.y;
        explosion.alpha = 0.7;
        explosion.play('explosion', 30, false, true);
        enemy.kill();
        bullet.kill()
    }




};
