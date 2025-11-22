# How to View Contact Messages

Contact messages from your website are automatically saved to Firebase Realtime Database. Here's how to view them:

## Method 1: Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **shsproject-d60d0**
3. Click on **Realtime Database** in the left sidebar
4. Navigate to the `contactMessages` node
5. You'll see all messages with the following structure:
   ```
   contactMessages
     └── [auto-generated-id]
         ├── name: "User Name"
         ├── email: "user@example.com"
         ├── subject: "General Inquiry"
         ├── message: "Message content..."
         ├── timestamp: 1234567890
         └── date: "2024-12-XX..."
   ```

## Method 2: Export Data

1. In Firebase Console, go to **Realtime Database**
2. Click the three dots menu (⋮) next to your database
3. Select **Export JSON**
4. Open the downloaded JSON file
5. Look for the `contactMessages` object

## Method 3: Set Up Email Notifications (Advanced)

For automatic email notifications when messages are received, you can:

1. Use Firebase Cloud Functions to send emails
2. Use a service like EmailJS
3. Set up a webhook to your email service

## Message Structure

Each message contains:
- **name**: Sender's name
- **email**: Sender's email address
- **subject**: Message subject (General Inquiry, Technical Support, etc.)
- **message**: The actual message content
- **timestamp**: Unix timestamp (milliseconds)
- **date**: ISO date string

## Tips

- Messages are stored in chronological order
- Each message has a unique auto-generated ID
- You can search/filter messages in Firebase Console
- Consider setting up Firebase Security Rules to protect this data

