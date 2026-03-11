const sgMail = require("@sendgrid/mail")

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const sendEmail = async (to, subject, html) => {
  const msg = {
    to,
    from: `PawPaw <${process.env.SENDGRID_FROM_EMAIL}>`,
    subject,
    html
  }

  await sgMail.send(msg)
}

module.exports = sendEmail