const crypto = require("crypto");
const nodemailer = require("nodemailer");

const generateOTP = () => {
  const digits = 6; // Set the number of digits in the OTP
  let otp = '';
  for (let i = 0; i < digits; i++) {
    otp += crypto.randomInt(0, 10); // Generate a random digit (0 to 9)
  }
  return otp;
};

const sendOTP = (email, OTP) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_SERVICE_USER,
      pass: process.env.EMAIL_SERVICE_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_SERVICE_USER,
    to: email,
    subject: '[royaljouroyal.vn] Xác thực đổi mật khẩu',  
    html: `
    <div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
<div style="margin:50px auto;width:70%;padding:20px 0">
  <div style="border-bottom:1px solid #eee">
    <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">FindRoom.vn ✔</a>
  </div>
  <p style="font-size:1.1em">Hi,</p>
  <p>Cảm ơn bạn đã chọn FindRoom.vn. Sử dụng mã OTP sau để đổi mật khẩu của bạn. OTP có giá trị vĩnh viễn . Không được chia sẻ dưới mọi hình thức</p>
  <h2 style="background: #00466a;margin: 0 auto;width: max-content;padding: 0 10px;color: #fff;border-radius: 4px;">${OTP}</h2>
  <p style="font-size:0.9em;">Dũng,<br />FindRoom.vn</p>
  <hr style="border:none;border-top:1px solid #eee" />
  <div style="float:right;padding:8px 0;color:#aaa;font-size:0.8em;line-height:1;font-weight:300">
    <p>Tòa nhà FPT Polytechnic</p>
    <p>P. Trịnh Văn Bô, Xuân Phương, Nam Từ Liêm</p>
    <p>Hà Nội</p>
  </div>
</div>
</div>
  `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

module.exports = { generateOTP, sendOTP };
