from __future__ import annotations

import base64
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Iterable

from flask import Flask, jsonify, request
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build


SCOPES = ["https://www.googleapis.com/auth/gmail.compose"]
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_CREDENTIALS_PATH = BASE_DIR / "credentials.json"
DEFAULT_TOKEN_PATH = BASE_DIR / "token.json"


def create_gmail_draft_with_attachments(
    recipient_email: str,
    subject: str,
    body_text: str,
    file_paths: Iterable[str | os.PathLike[str]],
    *,
    credentials_path: str | os.PathLike[str] = DEFAULT_CREDENTIALS_PATH,
    token_path: str | os.PathLike[str] = DEFAULT_TOKEN_PATH,
) -> tuple[str, str]:
    """
    Create a Gmail draft with multiple attachments and return (draft_id, gmail_url).
    """
    service = _build_gmail_service(credentials_path, token_path)
    message = _build_mime_message(recipient_email, subject, body_text, file_paths)

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    encoded_message = encoded_message.rstrip("=")

    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": encoded_message}})
        .execute()
    )

    draft_id = draft["id"]
    gmail_url = f"https://mail.google.com/mail/u/0/#drafts/{draft_id}"
    return draft_id, gmail_url


def _build_gmail_service(
    credentials_path: str | os.PathLike[str],
    token_path: str | os.PathLike[str],
):
    credentials_file = Path(credentials_path)
    token_file = Path(token_path)
    creds: Credentials | None = None

    if token_file.exists():
        creds = Credentials.from_authorized_user_file(str(token_file), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(str(credentials_file), SCOPES)
            creds = flow.run_local_server(port=0)

        token_file.write_text(creds.to_json(), encoding="utf-8")

    return build("gmail", "v1", credentials=creds)


def _build_mime_message(
    recipient_email: str,
    subject: str,
    body_text: str,
    file_paths: Iterable[str | os.PathLike[str]],
) -> MIMEMultipart:
    message = MIMEMultipart("mixed")
    message["To"] = recipient_email
    message["Subject"] = subject

    body = MIMEMultipart("alternative")
    body.attach(MIMEText(body_text, "plain", "utf-8"))
    body.attach(MIMEText(_plain_text_to_html(body_text), "html", "utf-8"))
    message.attach(body)

    for file_path in file_paths:
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"Attachment not found: {path}")

        attachment = MIMEApplication(path.read_bytes(), _subtype="pdf" if path.suffix.lower() == ".pdf" else "octet-stream")
        attachment.add_header("Content-Disposition", "attachment", filename=path.name)
        attachment.add_header("Content-ID", f"<{path.name}>")
        attachment.add_header("X-Attachment-Id", path.name)
        message.attach(attachment)

    return message


def _plain_text_to_html(body_text: str) -> str:
    escaped = (
        body_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br>")
    )
    return f"<html><body><p>{escaped}</p></body></html>"


app = Flask(__name__)


@app.post("/open-email-draft")
def open_email_draft():
    try:
        recipient_email = request.form["recipient_email"]
        subject = request.form.get("subject", "Documents for Review")
        body_text = request.form.get("body_text", "Hi [Name], please find the agreements attached.")
        file_paths = request.form.getlist("file_paths")

        draft_id, gmail_url = create_gmail_draft_with_attachments(
            recipient_email=recipient_email,
            subject=subject,
            body_text=body_text,
            file_paths=file_paths,
        )

        return jsonify({"ok": True, "draft_id": draft_id, "gmail_url": gmail_url})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
