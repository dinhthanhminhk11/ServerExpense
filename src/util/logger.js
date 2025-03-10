const chalk = require("chalk");

class Logger {
    constructor(enabled = true) {
        this.enabled = enabled;
    }

    log(message) {
        if (this.enabled) {
            console.log(chalk.white(message));
        }
    }

    info(message) {
        if (this.enabled) {
            console.log(chalk.blue('[INFO]'), chalk.blue(message));
        }
    }

    warn(message) {
        if (this.enabled) {
            console.log(chalk.yellow('[WARN]'), chalk.yellow(message));
        }
    }

    error(message) {
        if (this.enabled) {
            console.log(chalk.red('[ERROR]'), chalk.red(message));
        }
    }

    success(message) {
        if (this.enabled) {
            console.log(chalk.green('[SUCCESS]'), chalk.green(message));
        }
    }

    setEnabled(status) {
        this.enabled = status;
    }
}

module.exports = Logger;
