# Project Setup Guide

## Prerequisites
- [Node.js](https://nodejs.org/) (>= 16.x recommended)
- [Git](https://git-scm.com/)
- [MongoDB](https://www.mongodb.com/) (if required)

## Installation

### 1. Clone the Repository
```sh
git clone [https://github.com/your-username/your-repository.git](https://github.com/dinhthanhminhk11/SeverRetroMusic.git)
cd SeverRetroMusic
```

### 2. Install Dependencies
After navigating into the project directory, install the required dependencies:
```sh
npm i
```

### 3. Configure Environment Variables
Create a `.env` file in the project root and add the following:

```
PORT=8000
PASSWORD=PASSWORD
USERNAME=USERNAME
MAIL_EMAIL = "MAIL_EMAIL"
MAIL_PASSWORD = "MAIL_PASSWORD"
ACCESS_TOKEN_SECRET=ACCESS_TOKEN_SECRET
MONGO_URI=MONGO_URI

EMAIL_SERVICE_USER=EMAIL_SERVICE_USER
EMAIL_SERVICE_PASS=EMAIL_SERVICE_PASS
SECRET_KEY=SECRET_KEY
KEY_128 = KEY_128
IV_128 = IV_128
UPLOAD_PATH=uploads/
```

> **Note:** Never commit the `.env` file to version control.

### 4. Start the Application
For development mode:
```sh
npm run dev
```
For production mode:
```sh
npm start
```

## Additional Commands
Run tests:
```sh
npm test
```

Lint code:
```sh
npm run lint
```

## Contributing
1. Fork the repository
2. Create a new branch (`git checkout -b feature-branch`)
3. Commit changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature-branch`)
5. Open a Pull Request

## License
This project is licensed under the MIT License.

