Lane AI

An AI-powered bike-lane safety reporting prototype designed to help San Jose residents report hazards and help city staff prioritize appropriate responses.

Overview

Lane AI allows residents to submit a photo and written description of a bike-lane hazard. The prototype uses AI to identify the issue, assign a priority level, and suggest a city response. It was developed as part of an MBA consulting project focused on strategic and responsible AI innovation for the public good.

What Is Lane AI?

Lane AI combines the project's focus on safer bike lanes with its use of artificial intelligence.

The name represents a system intended to make bike-lane hazard reporting more accessible, understandable, and actionable. Instead of requiring residents to navigate a complicated reporting process, Lane AI helps translate an informal report into structured information that city transportation staff can review.

Why Lane AI?

Blocked or unsafe bike lanes can force cyclists into vehicle traffic, cause riders to change routes, and create stressful or dangerous travel conditions. These hazards may remain unresolved when residents do not know how to report them or face language, accessibility, or technology barriers.

Lane AI was designed around the needs of residents who may be less familiar with digital reporting tools, including older adults and people with limited English proficiency. The project aims to:

Make bike-lane hazard reporting easier and more accessible

Help residents communicate hazards through photos and plain-language descriptions

Give city staff better visibility into where and when safety issues occur

Organize reports by issue type, location, and priority

Support faster and more consistent review of reported hazards

The Solution

We developed and published a prototype that demonstrates an AI-assisted reporting workflow:

A resident uploads a photo of a bike-lane hazard and enters a written description.

The AI analyzes the submission and identifies the likely obstruction or safety issue.

The system assigns a priority level and recommends an appropriate city response.

City staff review the report and determine the next action.

The prototype is intended to support human decision-making—not replace it. City personnel remain responsible for validating reports, reviewing uncertain results, and deciding how to respond.

Key Features

Photo and text-based hazard reporting

AI-assisted hazard identification

Priority-level classification

Suggested city response

Resident-facing reporting workflow

Staff-oriented report review

Human-review recommendations for uncertain submissions

Responsible AI and Red-Team Testing

We evaluated Lane AI using the TRACE red-teaming framework, focusing on trust, access, and escalation risks. Testing identified several important failure modes:

Overconfident classifications: Blurry or unclear images could be incorrectly labeled as high-priority hazards.

Sensitive-data exposure: Photos and reports could contain exact addresses, license plates, people, or other identifiable information.

Duplicate escalation: Multiple submissions of the same hazard could generate redundant high-priority alerts.

Recommended safeguards include uncertainty warnings, human review for low-confidence results, restricted access to sensitive report details, masking of identifiable information, and duplicate-report detection.

Human-Centered Design

The project used stakeholder analysis, user personas, needs statements, and journey mapping to understand where the current reporting experience breaks down. The solution was designed around two primary stakeholder groups:

Residents who encounter unsafe bike-lane conditions, particularly those facing language or technology barriers

City transportation staff who need reliable community reports to identify recurring hazards and coordinate responses

Project Context

Lane AI was created for BUS 297D: Strategic AI Innovation for Business and Society at San Jose State University during Spring 2026. The course was structured as a public-sector consulting simulation in which teams evaluated a civic challenge, designed an AI-enabled solution, assessed feasibility and governance risks, built a working prototype, and prepared a strategic recommendation for City of San Jose and industry stakeholders.

Team

Laszlo Szieben

Jonathan Wang

Jitaditya Paul

Mai Phan

Disclaimer

Lane AI is an educational prototype and has not been deployed or endorsed by the City of San Jose. Its classifications and recommendations should not be used to make real-world safety or enforcement decisions without validation, human oversight, privacy protections, and additional technical testing.
