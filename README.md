[![Netlify Status](https://api.netlify.com/api/v1/badges/0fb37735-d140-4562-ad42-6fa56598d0f1/deploy-status)](https://app.netlify.com/sites/fdm-redo/deploys)

### Deploying for a new tenant

1. Go to Supabase, and create a new public bucket, using the tenant code as name (i.e. `arelux-italia`)
2. In that bucket, create directories `models`, `simple` and `images`
3. In that bucket, create files:
   - `email.txt` containing the plain text email body that gets sent along with the invoice
   - `email.html` containing the HTML email body that gets sent along with the invoice
   - `email.subj` containing the subject of that same email
   - `<name>.jpg`, with `<name>` replaced by the tenant name, containing the logo of the tenant
