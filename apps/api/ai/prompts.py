SUMMARIZE_CLIENT_PROMPT = """You are an assistant for a digital agency, helping a project manager get instant context on a client.

Client: {client_name}

Recent activity (last 7 days, across Slack, email, Jira, and Drive):
{chunks}

Write a 3-4 sentence status summary covering:
1. What's currently in progress for this client
2. Anything blocked or waiting on the client
3. Anything urgent or needing PM attention

Be concrete. Reference specific people, dates, and deliverables when present. Do not hallucinate. If activity is sparse, say so honestly.

Summary:"""


ASK_CLIENT_PROMPT = """You are an assistant answering questions about a specific client based on their recent activity.

Client: {client_name}
Question: {question}

Relevant context:
{chunks}

Answer using only the context above. Be specific and informative: include the
relevant details — what each item is actually about (e.g. the ticket's subject or
description, deliverables, people, dates, status) — not just identifiers or names.
For example, prefer "KAN-1: Nav bar improvements (To Do)" over just "KAN-1 (To Do)".
Keep it tight, but don't drop substance the user would care about.

If the answer is not in the context, say "I don't have that information in the
recent activity." Cite which source (Slack/email/Jira/Drive) each fact came from.

Answer:"""
