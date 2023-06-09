const { google } = require("googleapis");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Set up Gmail API credentials
const credentials = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
};

const oauth2Client = new google.auth.OAuth2(credentials.client_id, credentials.client_secret);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// Create a Gmail API client
const gmail = google.gmail({ version: "v1", auth: oauth2Client });

// Check for new emails
async function checkNewEmails() {
  try {
    const res = await gmail.users.messages.list({
      userId: process.env.GMAIL_USER,
      q: "is:unread",
    });
    // console.log(res)

    const emails = res.data.messages;
    console.log(emails);
    if (emails && emails.length > 0) {
      emails.map(async (email) => {
        const message = await gmail.users.messages.get({ userId: process.env.GMAIL_USER, id: email.id });
        // console.log(message.data.payload)

        const threadId = message.data.threadId;
        const replies = await gmail.users.threads.list({
          userId: process.env.GMAIL_USER,
          q: `in:inbox thread:${threadId}`,
        });
        // console.log(replies);

        if (!replies.data.threads || replies.data.threads.length === 1) {
          let to = message.data.payload.headers
            .find((header) => header.name === "From")
            .value.split(" ")
            .reverse()[0];
          to = to.slice(1, to.length - 1);
          const replyMessage = {
            to: to,
            subject: "Vacation Auto-Reply",
            body: "Thank you for your email. I am currently on vacation and will respond to your message when I return.",
          };
          console.log(replyMessage);
          await sendEmail(replyMessage);
        }
      });
    }

  } catch (error) {
    console.error("Error checking new emails:", error);
  }
}

// Send an email
async function sendEmail({ to, subject, body }) {
  try {
    const rawMessage = createRawMessage({
      from: process.env.GMAIL_USER,
      to,
      subject,
      body,
    });

    await gmail.users.messages.send({
      userId: process.env.GMAIL_USER,
      requestBody: {
        raw: rawMessage,
      },
    });

    console.log("Reply email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

// Helper function to create a raw email message
function createRawMessage({ from, to, subject, body }) {
  const emailLines = [];
  emailLines.push(`From: ${from}`);
  emailLines.push(`To: ${to}`);
  emailLines.push("Content-Type: text/html; charset=utf-8");
  emailLines.push("MIME-Version: 1.0");
  emailLines.push(`Subject: ${subject}`);
  emailLines.push("");
  emailLines.push(`${body}`);

  const email = emailLines.join("\r\n").trim();
  const encodedEmail = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
  return encodedEmail;
}

async function run() {
  while (true) {
    await checkNewEmails();
    const delay = Math.floor(Math.random() * (120000 - 45000 + 1)) + 45000; // Random delay between 45 and 120 seconds
    await sleep(delay);
  }
}

function sleep(delay) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

run().catch(console.error);
