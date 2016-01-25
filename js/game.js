/**
 * Created by Kay on 23.01.2016.
 */
var game = new Phaser.Game(800, 600);

game.state.add('Level_01', States.Level_01);

game.state.start('Level_01');