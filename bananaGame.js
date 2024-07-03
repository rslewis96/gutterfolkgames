let secretNumber = Math.floor(Math.random() * 100) + 1;
let users = {};

document.getElementById('login-button').addEventListener('click', function() {
    let username = document.getElementById('username').value.trim();
    if (username) {
        if (!users[username]) {
            users[username] = { guesses: [] };
        }
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('game-screen').style.display = 'block';
        document.getElementById('welcome-message').innerText = `Welcome, ${username}!`;
    }
});

document.getElementById('guess-button').addEventListener('click', function() {
    let username = document.getElementById('welcome-message').innerText.split(', ')[1].slice(0, -1);
    let guess = parseInt(document.getElementById('guess-input').value);

    if (isNaN(guess)) {
        document.getElementById('feedback-message').innerText = 'Please enter a valid number.';
        return;
    }

    users[username].guesses.push(guess);

    if (guess === secretNumber) {
        document.getElementById('announcement').innerText = `${username} guessed the secret number ${secretNumber}!`;
        document.getElementById('announcement').style.display = 'block';
        document.getElementById('feedback-message').innerText = '';
    } else if (guess > secretNumber) {
        document.getElementById('feedback-message').innerText = 'Too high. Try again!';
    } else {
        document.getElementById('feedback-message').innerText = 'Too low. Try again!';
    }
});
