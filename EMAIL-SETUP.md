# Receiving emails and messages from the website

Right now the site **saves** every enquiry, order and subscriber into
**Admin → Messages**, but it does not email anything out yet.

This guide switches on email delivery. **Option 1 takes about five minutes**
and needs no server and no coding beyond pasting one line.

---

## What gets sent once this is on

| Trigger | You receive |
|---|---|
| Customer places an order | Full order: items, sizes, total, address, phone, payment method |
| Customer uses the Contact form | Their name, email, phone and message |
| Someone joins the newsletter | Their email address |

Every one of these is **also** stored in Admin → Messages, so nothing is ever
lost even if the email provider has a bad day.

---

# Option 1 — Formspree (recommended)

Free for 50 messages a month. Works anywhere, including Netlify and GitHub Pages.

### Step 1 — Create the account
1. Go to **[formspree.io](https://formspree.io)** and sign up with the business
   email you want messages delivered to (`info.larabeautyatelier@gmail.com`).
2. Verify the email — Formspree sends a confirmation link.

### Step 2 — Create a form
1. Click **+ New Form**
2. Name it `Lara Beauty Website`
3. Set the recipient to the business email
4. Click **Create Form**

### Step 3 — Copy your form ID
Formspree shows an endpoint like:

```
https://formspree.io/f/xzbqwxyz
                       ^^^^^^^^
                       this is your ID
```

### Step 4 — Paste it into the site
Open **`email.js`** and edit the top block:

```js
const MAIL = {
  provider: 'formspree',                       // was 'none'

  to: 'info.larabeautyatelier@gmail.com',

  formspree: {
    id: 'xzbqwxyz'                             // paste your ID here
  },
```

### Step 5 — Upload and test
Re-upload the site (drag the folder onto Netlify, or `git push`).
Then place a test order on the live site.

The **first** message triggers a Formspree confirmation email — click the link
in it once, and everything after that arrives automatically.

Check **Admin → Messages**: the "Email sent" column should now read **Sent**
rather than *Saved only*.

---

# Option 2 — Netlify Forms

Free and built in, but only works after the site is deployed to Netlify.

1. In `email.js` set `provider: 'netlify'`
2. Add this hidden form just inside the `<body>` of **index.html**:

```html
<form name="lara-contact" netlify netlify-honeypot="bot-field" hidden>
  <input type="text" name="name">
  <input type="email" name="email">
  <input type="text" name="phone">
  <textarea name="message"></textarea>
  <input type="text" name="_subject">
  <input type="text" name="type">
  <textarea name="details"></textarea>
</form>
```

3. Deploy. Messages appear under **Netlify → Forms**.
4. To get them by email: **Site configuration → Forms → Form notifications →
   Add notification → Email notification**.

---

# Option 3 — EmailJS (send from your own Gmail)

Use this if the client wants mail to arrive *from* their own address.

1. Sign up at **[emailjs.com](https://emailjs.com)**
2. Add an **Email Service** (connect the Gmail account)
3. Create an **Email Template** using these variables:
   `{{name}}`, `{{email}}`, `{{phone}}`, `{{message}}`, `{{details}}`
4. Add the SDK to `index.html`, just above `<script src="email.js">`:

```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```

5. Fill in `email.js`:

```js
provider: 'emailjs',
emailjs: {
  serviceId:  'service_xxxxxxx',
  templateId: 'template_xxxxxxx',
  publicKey:  'xxxxxxxxxxxxxxx'
}
```

---

# WhatsApp enquiries

The Contact page already has a **Chat on WhatsApp** button. It uses the phone
number from **Admin → Settings → Phone**, so keep that field in international
format:

```
+234 801 234 5678
```

No setup needed — it opens WhatsApp directly with the shop.

---

# Changing where messages go

The business email, phone, Instagram and address all come from
**Admin → Settings**. Update them there and the Contact page, footer and
WhatsApp link all follow automatically.

If you change the *destination* for emails, update `MAIL.to` in `email.js`
**and** the recipient inside your Formspree form.

---

# Reading messages in the admin

**Admin → Messages** gives you:

- A gold badge in the sidebar showing unread count
- Filters for enquiries, orders and subscribers
- A **Reply** button that opens your mail app with the address filled in
- **Mark all read** and **Export CSV** for record-keeping
- An "Email sent" column so you can tell at a glance whether delivery worked

---

# Troubleshooting

**"Saved only" never becomes "Sent"**
The provider is still `'none'`, or the Formspree ID is wrong. Check `email.js`.

**Nothing arrives, but the admin says Sent**
Check spam. Formspree's first message needs a one-time confirmation click.

**Works on the live site but not on my computer**
Netlify Forms only work once deployed. Formspree and EmailJS work locally too.

**Formspree says "form not found"**
The ID is the part *after* `/f/` — no slashes, no full URL.

**I hit the 50/month limit**
Upgrade Formspree (about $10/month), or switch to Netlify Forms which allows
100/month free.

---

# A note on payments

Email alerts tell the client an order arrived, but **no money has moved**. To
actually take payment you still need Paystack or Flutterwave — both support
Nigerian cards, bank transfer and USSD. Ask and I can wire one in.
