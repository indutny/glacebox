# Glacebox

Don't forget to create `~/.glacebox.json`:

```json
{
  "host": "hostname-for-oauth",
  "port": "port-to-run-dropbox-oauth-server",
  "parallel": "maximum-number-of-parallel-uploads-and-downloads",
  "dropbox": {
    "key": "your-key",
    "secret": "your-secret"
  },
  "aws": {
    "container": "s3-container-name",
    "accessKeyId": "your-aws-access-key-id",
    "secretAccessKey": "and-secret-access-key"
  }
}
```

Then, just start `glacebox` and follow instructions. Note, that this is really
raw and simple utility and it doesn't account deltas, revisions changes.
Consider is as a `copy -rf dropbox/* aws/` analogue.
