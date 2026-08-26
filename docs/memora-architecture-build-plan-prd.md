# Memora — Architecture, Build Plan & Product Requirements Document


## Brand decision

**Memora** (pronounced *meh-MOR-ah*) is a root-derived name from Latin *memoria*, meaning memory or remembrance. It gives the product a direct, warm and extensible territory: the creator’s durable memory for audience relationships.

The name is broader than a single “recall” feature. It can support persistent viewer memory, unresolved questions, reply prioritisation, follow-up recommendations and Minds publishing without being tied to one platform or one implementation detail. Trademark, domain, social-handle and legal clearance have not been performed.

Assumptions 
I’m scoping this as a 4-week hackathon MVP for Memora, using: 
Minds Agent as the persistent memory/reasoning layer. 
YouTube comments as the main realistic MVP data source. 
Imported/sample livestream chat to prove cross-platform continuity. 
Creator-approved actions only, not fully autonomous posting. 
No files were edited or saved because we are in planning mode. 
Product Requirements Document 
1. Executive Summary 
Memora is a Minds-powered audience memory agent for creators. 
It remembers meaningful fan interactions across YouTube comments and livestream chat, 
identifies who deserves a response, tracks unresolved questions, and autonomously suggests 
follow-ups when new content creates a reason to reconnect. 
Core idea: 
Creators forget important fans. Memora gives them a persistent Mind that 
remembers who matters, what they asked, and when to follow up. 
 
This fits the hackathon’s Audience Growth & Engagement track because it helps creators retain, 
understand, and re-engage their audience. 
2. Problem Statement 
Creators receive fragmented audience interactions across comments, livestreams, community 
posts, and DMs. 
The problem is not simply “too many comments.” The deeper problem is: 
Audience relationship history disappears. 
 
Creators lose track of: 
important unanswered questions 
loyal fans who keep showing up 
viewers who asked the same thing before 
emotionally meaningful comments 
product/course buying intent 
promises made during livestreams 
moderation context 
recurring audience confusion 
Current platforms treat each interaction as isolated. A YouTube comment does not know what 
happened in last week’s livestream. Twitch chat disappears unless captured in real time. 
Creators are forced to rely on memory, spreadsheets, moderators, or manual scanning. 
3. Target User 
Primary persona: YouTube-first knowledge creator 
Examples: 
tech educators 
design/tutorial creators 
course creators 
fitness coaches 


music teachers 
gaming educators 
indie product creators 
creators selling templates, coaching, memberships, or courses 
Why this user is best: 
Their comments contain high-value questions. 
Replies can drive trust and sales. 
They often livestream or host Q&A. 
They personally care about community intimacy. 
They are overwhelmed but not yet big enough for a full team. 
Secondary persona: livestream creator/community manager 
Examples: 
Twitch streamers 
YouTube Live creators 
community managers 
creator assistants 
Their pain is stronger around disappearing chat history and missed real-time questions. 
4. Core Value Proposition 
Memora helps creators answer: 
Who should I reply to first? 
What did this viewer ask before? 
Which fans are becoming loyal? 
Which questions did I miss? 
Which old comments are now worth following up on? 
What should become my next video, pinned comment, or stream topic? 
Promise: 
Turn disposable audience interactions into persistent relationship memory. 
 
5. MVP Scope 
Must Have 
Creator Dashboard 
Shows imported comments/chat. 
Shows top audience memories. 
Shows unresolved questions. 
Shows follow-up opportunities. 
YouTube Comment Import 
MVP can use YouTube API or CSV/demo import. 
Import comment text, author, video, timestamp, like count, reply status. 
Livestream Chat Import 
MVP can use sample Twitch/YouTube Live chat export. 
Purpose is to prove continuity, not full real-time ingestion. 
Audience Memory Cards 
Each viewer gets a profile. 
Stores past interactions, topics, unresolved questions, loyalty signals, and suggested action. 


Reply Priority Queue 
Ranks comments by importance. 
Explains why each comment matters. 
Unresolved Question Tracker 
Detects unanswered or repeated questions. 
Groups similar questions. 
Autonomous Follow-Up Suggestions 
When a new video/topic is added, the Mind checks old memories. 
Suggests who to follow up with and why. 
Minds Agent Memory 
Mind stores/retrieves viewer context. 
Mind explains recommendations. 
Mind records outcomes after creator action. 
Should Have 
Draft replies in creator voice. 
“Turn this into content” suggestions. 
Demo proof page showing memory continuity. 
Basic privacy controls: delete viewer memory, mark ignored, clear demo data. 
Could Have 
Real YouTube OAuth. 
Real Twitch bot ingestion. 
Automated scheduled sync. 
Moderation context scoring. 
Creator tone learning. 
Won’t Have For MVP 
Fully automated posting. 
Full CRM. 
Discord/Instagram/TikTok integrations. 
Team permissions. 
Billing. 
Production-grade analytics. 
Real-time livestream overlay. 
6. Key User Stories 
As a creator, I can import comments from a video so I can see audience questions. 
As a creator, I can import livestream chat so old stream context is not lost. 
As a creator, I can see which comments deserve replies first. 
As a creator, I can understand why the Mind prioritized a viewer. 
As a creator, I can see a viewer’s memory card. 
As a creator, I can see unresolved questions from my audience. 
As a creator, I can add a new video/topic and get follow-up suggestions. 
As a creator, I can approve, dismiss, or mark a follow-up complete. 
As a creator, I can see what the Mind remembered from previous sessions. 
As a judge, I can clearly see memory, continuity, and autonomous follow-up in the demo. 
7. Acceptance Criteria 


The MVP is successful if the demo can show: 
A viewer asks something in livestream chat. 
The system stores that as memory. 
The same or related viewer comments later on YouTube. 
Memora connects the two interactions. 
The Mind recommends a follow-up. 
The recommendation includes a clear explanation. 
The creator approves or dismisses the action. 
The memory updates after the action. 
The core demo line should be: 
“This recommendation exists because the Mind remembered something from the 
past.” 
 
8. Main Screens 
Landing Page 
Purpose: explain the product quickly. 
Sections: 
headline 
problem 
demo flow 
Minds-powered memory explanation 
CTA to dashboard/demo 
Dashboard 
Shows: 
total imported interactions 
unresolved questions 
top loyal fans 
high-priority replies 
follow-up opportunities 
Memory Queue 
A prioritized list of comments/viewers. 
Each item shows: 
viewer name 
comment/message 
priority score 
reason 
suggested action 
approve/dismiss buttons 
Audience Memory Card 
Shows: 
viewer profile 
past comments/chat 
topics they care about 
unresolved questions 


loyalty signal 
recommended next action 
Follow-Up Lab 
Creator adds or selects a new content topic. 
Example: 
“New video: Beginner Editing Workflow” 
 
Memora returns: 
viewers to follow up with 
old questions this content answers 
suggested replies 
source memories used 
Proof Page 
For hackathon judging. 
Shows: 
imported livestream message 
imported YouTube comment 
generated memory 
autonomous follow-up recommendation 
recorded outcome 
Architecture 
Recommended Stack 
Given the repo appears Next.js-oriented, I’d use: 
Frontend: Next.js App Router + TypeScript 
Styling: Tailwind CSS 
Database: Postgres via Supabase or existing Postgres setup 
ORM: Drizzle if already configured in the repo 
Auth: Supabase Auth or simple demo auth for hackathon 
Agent Layer: Minds Agent API 
LLM Support: Minds reasoning first, optional OpenAI-compatible model for classification/drafting 
Jobs: Vercel Cron, Supabase Edge Functions, or simple server-triggered jobs 
Deployment: Vercel 
Storage: Supabase Storage if uploads/CSV imports are needed 
High-Level System 
Creator 
  ↓ 
Memora Web App 
  ↓ 
Import Layer 
  → YouTube comments 
  → Livestream chat CSV/demo data 
  ↓ 
Postgres Database 
  ↓ 


Minds Agent 
  → stores persistent audience memory 
  → retrieves viewer context 
  → ranks important interactions 
  → suggests follow-ups 
  → records outcomes 
  ↓ 
Creator Dashboard 
  → reply queue 
  → memory cards 
  → follow-up suggestions 
 
Core Minds Agent Responsibilities 
The Mind should have tools/functions like: 
storeAudienceInteraction 
getViewerMemory 
updateViewerMemory 
rankReplyOpportunities 
detectUnresolvedQuestions 
generateFollowUpSuggestions 
recordCreatorAction 
explainRecommendation 
This makes the Mind central, not decorative. 
Data Model 
creators 
Stores creator accounts. 
Fields: 
id 
name 
email 
minds_agent_id 
youtube_channel_id 
created_at 
updated_at 
sources 
Represents imported platforms/content sources. 
Fields: 
id 
creator_id 
type such as youtube_video, livestream_chat, manual_demo 
title 


external_id 
url 
imported_at 
audience_members 
Represents viewers/fans. 
Fields: 
id 
creator_id 
display_name 
platform 
platform_user_id 
first_seen_at 
last_seen_at 
created_at 
interactions 
Stores raw comments/chat. 
Fields: 
id 
creator_id 
audience_member_id 
source_id 
platform 
type such as comment, chat, reply 
text 
timestamp 
metadata_json 
created_at 
viewer_memories 
Stores summarized persistent memory. 
Fields: 
id 
creator_id 
audience_member_id 
summary 
topics_json 
loyalty_score 
risk_score 
unresolved_count 
last_meaningful_interaction_at 
minds_memory_ref 


updated_at 
unresolved_questions 
Tracks open loops. 
Fields: 
id 
creator_id 
audience_member_id 
interaction_id 
question 
status such as open, answered, dismissed 
resolved_by_action_id 
created_at 
updated_at 
reply_opportunities 
Priority queue items. 
Fields: 
id 
creator_id 
audience_member_id 
interaction_id 
priority_score 
reason 
suggested_reply 
status such as new, approved, dismissed, completed 
created_at 
follow_up_opportunities 
Autonomous follow-up suggestions. 
Fields: 
id 
creator_id 
audience_member_id 
trigger_type such as new_video, new_topic, manual_demo 
trigger_text 
reason 
suggested_action 
suggested_copy 
source_memory_ids_json 
status 
created_at 
creator_actions 


Tracks what the creator did. 
Fields: 
id 
creator_id 
audience_member_id 
action_type 
text 
status 
created_at 
API Routes 
Possible routes: 
POST /api/import/youtube-comments 
POST /api/import/livestream-chat 
POST /api/memory/rebuild 
GET /api/audience 
GET /api/audience/:id 
GET /api/reply-queue 
POST /api/reply-queue/:id/approve 
POST /api/reply-queue/:id/dismiss 
POST /api/followups/generate 
POST /api/followups/:id/complete 
GET /api/proof 
Agent Flow 
Ingestion 
Import comment/chat. 
Save raw interaction. 
Send interaction to Minds Agent. 
Mind updates viewer memory. 
System stores memory reference and summary. 
Prioritization 
Fetch recent interactions. 
Retrieve viewer memories. 
Mind ranks reply opportunities. 
Store priority queue with explanations. 
Autonomous Follow-Up 
Creator adds new video/topic. 
Mind searches old unresolved questions and viewer memories. 
Mind generates follow-up suggestions. 
Creator approves/dismisses. 
Outcome is saved back into memory. 
Build Plan 
Week 1: Foundation 


Goal: working app shell and data ingestion. 
Tasks: 
Confirm exact Minds API capabilities. 
Set up database schema. 
Build landing page and dashboard shell. 
Build import flow for demo data. 
Add YouTube comment import fallback via CSV/manual JSON. 
Add livestream chat import fallback. 
Store creators, sources, audience members, and interactions. 
Create seed/demo dataset. 
Deliverable: 
Creator can open dashboard and see imported YouTube comments plus livestream 
chat. 
 
Week 2: Memory Layer 
Goal: make Minds memory central. 
Tasks: 
Connect app to Minds Agent. 
Create memory update flow. 
Generate audience memory cards. 
Store viewer summaries and topics. 
Detect unresolved questions. 
Build audience memory page. 
Build unresolved question tracker. 
Add recommendation explanations. 
Deliverable: 
Memora can show what it remembers about each viewer and cite past 
interactions. 
 
Week 3: Reply Queue + Follow-Up Engine 
Goal: complete the core product loop. 
Tasks: 
Build reply priority queue. 
Add priority scoring. 
Generate suggested replies. 
Build new-content trigger flow. 
Generate autonomous follow-up suggestions. 
Add approve/dismiss/complete actions. 
Record creator actions back into memory. 
Deliverable: 
Creator can see who to reply to, why, and what follow-up is due after new content. 
 
Week 4: Demo Hardening 
Goal: make the hackathon submission judge-proof. 


Tasks: 
Build proof page. 
Polish UI and copy. 
Add loading, empty, and error states. 
Add privacy/safety messaging. 
Add demo reset button if needed. 
Add tests for scoring, imports, and follow-up generation. 
Run lint, typecheck, tests, and production build. 
Prepare 90-120 second demo script. 
Deliverable: 
Reliable demo showing memory, continuity, and autonomous follow-up. 
 
Demo Script 
Scene 1: The problem 
Show messy creator interactions. 
Livestream chat contains Alex asking about beginner editing software. 
YouTube comments contain Maya giving thoughtful feedback. 
Another comment asks about a course/product. 
Scene 2: Memora remembers 
Open audience memory cards. 
Alex: asked about editing workflow during livestream. 
Maya: recurring thoughtful commenter. 
Jordan: high-intent course question. 
Scene 3: Memora prioritizes 
Open reply queue. 
Memora says: 
“Reply to Alex first. He asked this during your livestream and never received an 
answer.” 
 
Scene 4: Autonomous follow-up 
Add new video: 
“Beginner Editing Workflow” 
 
Memora says: 
“This video answers Alex’s old question. Follow up now.” 
 
Scene 5: Proof 
Show: 
old chat 
new comment/video 
memory card 
follow-up recommendation 
creator action recorded 
Final line: 


“Without memory, this is just another comment. With Memora, it becomes a 
continued relationship.” 
 
Risks 
Minds API Uncertainty 
Risk: API docs or capabilities may be limited. 
Mitigation: 
Abstract Minds integration behind a service layer. 
Use demo-compatible memory calls. 
Keep fallback local memory for UI reliability while showing Minds usage clearly. 
YouTube API Complexity 
Risk: OAuth/API quota slows development. 
Mitigation: 
Support CSV/demo import first. 
Add real API only if time permits. 
Scope Creep 
Risk: Hybrid platform becomes too broad. 
Mitigation: 
Build YouTube-first. 
Use livestream chat only to prove continuity. 
Avoid Discord/TikTok/Instagram for MVP. 
Privacy Concern 
Risk: Audience memory can feel creepy. 
Mitigation: 
Use public comments/chat only. 
Show source messages. 
Add delete/dismiss controls. 
Frame as “creator memory,” not surveillance. 
Weak Minds Integration 
Risk: Judges see Minds as bolted on. 
Mitigation: 
Every recommendation must show remembered context. 
Demo must explicitly show memory across sessions. 
Store outcomes back into the Mind. 
Success Metrics 
For hackathon: 
Can demonstrate memory across sessions. 
Can demonstrate continuity from livestream to YouTube. 
Can demonstrate autonomous follow-up. 
Can explain why the Mind is essential. 
Demo works reliably in under 2 minutes. 
Product metrics later: 
percentage of high-priority comments answered 
unresolved questions closed 


creator time saved 
returning fan engagement 
follow-ups approved 
content ideas generated from audience questions 
Final Recommended Build Direction 
Build the hybrid vision, but ship a YouTube-first MVP with livestream continuity proof. 
Position it as: 
Memora is the persistent audience memory layer for creators. It starts with 
YouTube comments and livestream chat, then grows into a cross-platform 
relationship memory system. 
 
This gives you: 
clear creator pain 
strong Minds integration 
feasible hackathon scope 
differentiated demo 
future scalability 
 
 
 
Locked Direction Build Memora as a fresh Next.js + Supabase app. 
Core demo: 
A creator imports YouTube comments and livestream chat, Memora builds 
persistent audience memory through a Minds agent, then recommends who to reply 
to or follow up with based on past context. 
 
Final Stack 
Frontend: Next.js App Router 
Language: TypeScript 
Styling: Tailwind CSS 
UI: shadcn/ui or simple custom components 
Database: Supabase Postgres 
Auth: Supabase Auth 
Storage: Supabase Storage if CSV uploads are used 
Agent: Minds Agent API 
YouTube: YouTube Data API v3 
Deployment: Vercel 
Demo fallback: CSV/manual import 
Core Architecture 
Next.js App 
  ↓ 
Supabase Auth 
  ↓ 
Creator Dashboard 


  ↓ 
Import Layer 
  → YouTube Data API 
  → CSV/demo upload 
  ↓ 
Supabase Postgres 
  ↓ 
Minds Agent Layer 
  → persistent viewer memory 
  → unresolved question tracking 
  → reply prioritization 
  → autonomous follow-up suggestions 
  ↓ 
Dashboard UI 
  → Memory cards 
  → Reply queue 
  → Follow-up lab 
  → Demo proof page 
 
Database Tables 
creators 
Stores creator profile and integration state. 
Fields: 
id 
user_id 
display_name 
youtube_channel_id 
minds_agent_id 
created_at 
updated_at 
youtube_connections 
Stores YouTube OAuth connection. 
Fields: 
id 
creator_id 
youtube_channel_id 
access_token_encrypted 
refresh_token_encrypted 
expires_at 
created_at 
updated_at 
sources 


Represents videos, livestreams, CSV imports, or demo datasets. 
Fields: 
id 
creator_id 
platform 
source_type 
external_id 
title 
url 
imported_at 
audience_members 
Represents viewers/commenters. 
Fields: 
id 
creator_id 
platform 
platform_user_id 
display_name 
avatar_url 
first_seen_at 
last_seen_at 
interactions 
Stores raw comments/chat messages. 
Fields: 
id 
creator_id 
audience_member_id 
source_id 
platform 
interaction_type 
text 
published_at 
like_count 
reply_count 
raw_json 
viewer_memories 
Stores persistent memory summaries. 
Fields: 
id 


creator_id 
audience_member_id 
summary 
topics 
loyalty_score 
intent_score 
risk_score 
unresolved_count 
minds_memory_ref 
updated_at 
unresolved_questions 
Tracks open loops. 
Fields: 
id 
creator_id 
audience_member_id 
interaction_id 
question_text 
status 
created_at 
resolved_at 
reply_opportunities 
Prioritized creator actions. 
Fields: 
id 
creator_id 
audience_member_id 
interaction_id 
priority_score 
reason 
suggested_reply 
status 
created_at 
follow_up_opportunities 
Autonomous follow-up suggestions. 
Fields: 
id 
creator_id 
audience_member_id 


trigger_type 
trigger_text 
reason 
suggested_action 
suggested_copy 
status 
created_at 
creator_actions 
Tracks approvals, dismissals, and completed actions. 
Fields: 
id 
creator_id 
audience_member_id 
action_type 
text 
status 
created_at 
Main Pages 
/ 
Landing page. 
Purpose: 
explain Memora 
show hackathon value 
CTA to sign in or try demo 
/dashboard 
Main overview. 
Shows: 
imported comments 
unresolved questions 
top fans 
reply opportunities 
follow-up suggestions 
/connect/youtube 
YouTube OAuth connection. 
Actions: 
connect channel 
show connected status 
fetch recent videos 
/import 
Import center. 
Includes: 


YouTube video comment import 
CSV/demo import 
livestream chat CSV import 
seeded demo data option 
/memory 
Audience memory directory. 
Shows: 
audience member cards 
loyalty score 
topics 
last interaction 
unresolved questions 
/memory/[id] 
Detailed viewer memory. 
Shows: 
full interaction timeline 
Mind-generated memory summary 
unresolved questions 
recommended next action 
/reply-queue 
Prioritized reply queue. 
Shows: 
comment/message 
why it matters 
suggested reply 
approve/dismiss/complete 
/follow-up 
Autonomous follow-up lab. 
Creator enters: 
“New video: Beginner Editing Workflow” 
 
Mind returns: 
old viewers to follow up with 
source memories 
suggested replies 
/proof 
Hackathon proof page. 
Shows: 
livestream chat memory 
YouTube comment 
viewer memory card 
autonomous follow-up 
creator action recorded 


This page is important for judges. 
API Routes 
YouTube 
GET /api/youtube/connect 
GET /api/youtube/callback 
GET /api/youtube/videos 
POST /api/youtube/import-comments 
CSV/demo import 
POST /api/import/csv 
POST /api/import/demo 
POST /api/import/livestream-chat 
Memory 
POST /api/memory/process 
GET /api/memory 
GET /api/memory/[id] 
Reply queue 
POST /api/reply/generate 
GET /api/reply 
POST /api/reply/[id]/approve 
POST /api/reply/[id]/dismiss 
POST /api/reply/[id]/complete 
Follow-up 
POST /api/follow-up/generate 
GET /api/follow-up 
POST /api/follow-up/[id]/complete 
POST /api/follow-up/[id]/dismiss 
Proof 
GET /api/proof 
Minds Agent Integration 
The Minds agent must be used for the product’s core value. 
Use it for: 
Memory creation 
Summarize each viewer’s important context. 
Remember repeated topics and unresolved questions. 
Continuity 
Retrieve past viewer context before generating recommendations. 
Connect livestream chat to later YouTube comments. 
Autonomous follow-up 
Given a new video/topic, identify old audience members who should receive follow-up. 
Explanation 
Explain why a viewer is important. 


Cite source interactions. 
Outcome memory 
Remember if the creator approved, dismissed, or completed a recommendation. 
Build Plan 
Phase 1: Project Foundation 
Goal: app shell, auth, database. 
Tasks: 
Create fresh Next.js app. 
Add TypeScript strict mode. 
Add Tailwind. 
Add shadcn/ui if desired. 
Set up Supabase project. 
Add Supabase Auth. 
Create database schema. 
Add environment variables. 
Build landing page and dashboard shell. 
Deliverable: 
User can sign in and see the empty Memora dashboard. 
 
Phase 2: Import System 
Goal: get audience data into the app. 
Tasks: 
Build CSV/demo import first. 
Add seeded demo dataset. 
Add livestream chat CSV import. 
Add YouTube OAuth. 
Fetch creator videos. 
Import comments from selected YouTube video. 
Normalize comments/chat into interactions. 
Deliverable: 
Creator can import real YouTube comments and demo livestream chat. 
 
Phase 3: Minds Memory Layer 
Goal: make the Mind central. 
Tasks: 
Connect Minds Agent API. 
Send imported interactions to the Mind. 
Generate viewer memory cards. 
Store memory summaries in Supabase. 
Track unresolved questions. 
Retrieve prior memory before new recommendations. 
Deliverable: 
App shows persistent viewer memory generated by the Mind. 
 


Phase 4: Reply Priority Queue 
Goal: identify who deserves attention. 
Tasks: 
Score comments/messages. 
Detect high-value questions. 
Detect loyal/repeat fans. 
Detect buyer/product/course intent. 
Generate suggested replies. 
Add explanations. 
Add approve/dismiss/complete actions. 
Deliverable: 
Creator sees who to reply to first and why. 
 
Phase 5: Autonomous Follow-Up 
Goal: prove continuity. 
Tasks: 
Build “new content/topic” input. 
Mind searches past memories. 
Generate follow-up suggestions. 
Show source memory used. 
Allow creator approval/dismissal. 
Record outcome back into memory. 
Deliverable: 
Memora recommends a follow-up because it remembers past audience context. 
 
Phase 6: Hackathon Polish 
Goal: make it judge-ready. 
Tasks: 
Build /proof page. 
Add clear demo data reset. 
Improve loading/empty/error states. 
Add privacy messaging. 
Add basic tests. 
Run lint, typecheck, and build. 
Prepare 90-120 second demo video script. 
Deliverable: 
Reliable demo showing memory, continuity, autonomous follow-up, and Minds 
integration. 
 
4-Week Timeline 
Week 1 
Fresh app setup 
Supabase setup 
Auth 


Database schema 
Dashboard shell 
CSV/demo import 
Week 2 
YouTube OAuth 
YouTube comment import 
Livestream CSV import 
Interaction normalization 
Basic audience member profiles 
Week 3 
Minds Agent integration 
Viewer memory cards 
Unresolved question tracker 
Reply priority queue 
Suggested replies 
Week 4 
Follow-up engine 
Proof page 
UI polish 
Testing 
Demo video 
Documentation 
Priority Order 
Build in this order: 
CSV/demo import 
Database schema 
Dashboard 
YouTube import 
Minds memory 
Memory cards 
Reply queue 
Follow-up lab 
Proof page 
Polish/testing 
Reason: CSV/demo import guarantees the demo can work even if YouTube or Minds API 
integration has issues. 
Key Risks 
Risk 
Mitigation 
YouTube OAuth takes too long 
Build CSV/demo import first 
YouTube API quota issues 
Limit to selected videos 
Minds API uncertainty 


Wrap Minds calls in a service layer 
Weak hackathon story 
Build /proof page 
Too much scope 
YouTube-first, livestream as imported demo data 
Privacy concerns 
Use public comments only, add delete/dismiss controls 
Testing Plan 
Minimum checks: 
Import CSV data successfully. 
Import YouTube comments successfully. 
Duplicate imports do not create duplicate audience members. 
Viewer memory is generated. 
Unresolved questions are detected. 
Reply queue generates items. 
Follow-up suggestions cite old memory. 
Creator actions update status. 
Run npm run lint. 
Run npm run typecheck. 
Run npm run build. 
Final MVP Definition 
The MVP is complete when this works: 
Creator signs in. 
Creator imports YouTube comments. 
Creator imports sample livestream chat. 
Memora creates viewer memory cards. 
Memora ranks important replies. 
Creator adds a new video/topic. 
Memora suggests follow-ups based on old memory. 
Proof page clearly shows the continuity.   
 
 
 
Updated Product Direction 
Memora will use Minds in two core ways: 
Agent memory/reasoning layer 
Stores persistent audience memory. 
Remembers viewer history across sessions. 
Connects YouTube comments and livestream chat. 
Generates reply priority, unresolved questions, and follow-up suggestions. 
Explains why each recommendation exists. 
Minds publishing/drafting layer 
Lets creators publish or draft follow-up updates back to Minds. 
Examples: 


thank a loyal fan 
answer a recurring audience question 
post a community follow-up 
share a “you asked, I answered” update 
publish a summarized Q&A from audience memory 
This makes Minds highly visible in the submission, not just hidden in the backend. 
Refined Core Flow 
Import YouTube comments + livestream chat 
  ↓ 
Minds Agent builds audience memory 
  ↓ 
Memora shows priority replies + unresolved questions 
  ↓ 
Creator adds new video/topic 
  ↓ 
Minds Agent finds old viewers/questions worth following up with 
  ↓ 
Creator approves a draft 
  ↓ 
App publishes or saves draft to Minds 
  ↓ 
Minds Agent remembers the action happened 
 
Updated MVP Features 
Must Have 
Supabase Auth 
Creator dashboard 
CSV/demo import 
Real YouTube comment import 
Livestream chat import 
Minds Agent memory integration 
Audience memory cards 
Reply priority queue 
Unresolved question tracker 
Follow-up generator 
Minds draft/publish flow 
Hackathon proof page 
Minds Publish/Draft Feature 
Add a page or section called: 
Minds Outbox 
It should show: 
suggested Minds post 
source audience memories 
why the Mind generated it 


edit field 
Save Draft 
Publish to Minds 
status: drafted, published, failed, dismissed 
Example generated post: 
Last week, a few of you asked about beginner editing workflows, especially Alex 
and Jordan. I just published a breakdown covering the setup, software, and 
mistakes I wish I avoided earlier. Thanks for pushing me to make this. 
 
This proves: 
memory 
continuity 
autonomous follow-up 
creator approval 
Minds publishing 
Additional Tables Needed 
minds_connections 
Stores Minds account/API connection. 
Fields: 
id 
creator_id 
minds_user_id 
minds_username 
access_token_encrypted 
refresh_token_encrypted 
expires_at 
created_at 
updated_at 
minds_outbox 
Stores drafts and published actions. 
Fields: 
id 
creator_id 
follow_up_opportunity_id 
title 
draft_text 
edited_text 
status 
minds_post_id 
minds_post_url 
error_message 


created_at 
published_at 
agent_memory_events 
Audit trail proving Minds memory usage. 
Fields: 
id 
creator_id 
audience_member_id 
event_type 
input_summary 
output_summary 
minds_memory_ref 
created_at 
Updated Pages 
Add these to the previous plan: 
/connect/minds 
Purpose: 
connect Minds account 
show agent status 
show publishing permission/status 
/minds-outbox 
Purpose: 
show drafts generated by the Mind 
edit copy before publishing 
publish to Minds 
show published URL/proof 
/proof 
Should include: 
imported YouTube comment 
imported livestream chat 
generated memory 
follow-up recommendation 
Minds draft 
published Minds URL or saved draft proof 
Updated API Routes 
Minds connection 
GET /api/minds/connect 
GET /api/minds/callback 
POST /api/minds/token 
POST /api/minds/disconnect 
Minds agent memory 


POST /api/minds/memory/store 
POST /api/minds/memory/retrieve 
POST /api/minds/reason/follow-up 
POST /api/minds/reason/reply-priority 
Minds outbox 
POST /api/minds/outbox/create 
GET /api/minds/outbox 
PATCH /api/minds/outbox/[id] 
POST /api/minds/outbox/[id]/publish 
Demo Story Now Becomes Stronger 
Alex asks a question in livestream chat. 
Memora stores it in Minds memory. 
Alex later comments on YouTube. 
Memora connects the two. 
Creator adds a new video topic. 
Mind generates a follow-up. 
Creator approves a Minds post. 
App publishes or drafts it to Minds. 
Proof page shows the entire chain. 
Final demo line: 
“Memora does not just remember the audience. It acts on that memory by helping 
creators follow up publicly on Minds.” 
 
Build Priority 
Updated implementation order: 
Fresh Next.js + Supabase setup 
Auth and database 
CSV/demo import 
YouTube API import 
Minds connection 
Minds memory processing 
Memory cards 
Reply queue 
Follow-up generator 
Minds outbox draft/publish 
Proof page 
Polish, tests, build 
 
 
Updated First Build Step 
The first implementation task should be a Minds Integration Spike. 
Goal: 


Discover the exact Minds auth/publish capabilities, then build the integration so 
Memora works even if direct publishing is unavailable. 
 
Minds Integration Strategy 
Primary Path 
If Minds supports authenticated publishing or drafts: 
Creator connects Minds. 
Memora generates a follow-up post from audience memory. 
Creator reviews/edits. 
Creator clicks Publish to Minds or Create Draft. 
App stores returned Minds post/draft ID and URL. 
Proof page shows the published/drafted Minds result. 
Fallback Path 
If publishing API is unavailable or unclear: 
Memora generates a Minds-ready post. 
Creator reviews/edits. 
App provides: 
Copy post text 
Open Minds composer 
Creator manually pastes/publishes. 
App records the draft as copy_ready, not falsely as published. 
This keeps the demo reliable. 
Capability-Based Design 
Use a MindsService abstraction with capability detection: 
type MindsCapabilities = { 
  memory: boolean; 
  draft: boolean; 
  publish: boolean; 
  shareIntent: boolean; 
}; 
 
Possible states: 
publish: direct publishing works 
draft: draft creation works 
shareIntent: open Minds composer fallback 
copyOnly: copy text fallback 
The UI should visibly show the current mode. 
Example: 
Minds publishing API unavailable. Memora will generate a Minds-ready draft and 
open the Minds composer. 
 
Important Rule 


The app should never say something was “published” unless Minds returns a real post ID or 
URL. 
Statuses: 
draft_generated 
copy_ready 
composer_opened 
published 
failed 
Updated Build Plan Order 
Minds API discovery spike 
Find auth method. 
Find memory/agent API usage. 
Find publish/draft capability. 
Identify scopes and token flow. 
Document fallback behavior. 
Fresh Next.js + Supabase setup 
Database schema 
Include minds_connections 
Include minds_outbox 
Include agent_memory_events 
CSV/demo import 
Guarantee demo data works before external APIs. 
YouTube API 
OAuth 
fetch videos 
import comments 
Minds memory layer 
send interactions to Mind 
retrieve viewer memory 
generate memory cards 
Reply queue 
rank important comments 
explain why they matter 
Follow-up engine 
new video/topic trigger 
old memory retrieval 
suggested action generation 
Minds outbox 
draft generation 
edit draft 
publish if available 
fallback copy/open composer if unavailable 
Proof page 


show full chain: livestream chat → memory → YouTube comment → follow-up → 
Minds draft/publish 
Demo-Safe Final Flow 
Even if Minds publishing is limited, the demo still works: 
Alex asks a question in livestream chat 
  ↓ 
Memora stores it in Minds memory 
  ↓ 
Alex later comments on YouTube 
  ↓ 
Mind connects both interactions 
  ↓ 
Creator adds new video topic 
  ↓ 
Mind generates follow-up 
  ↓ 
Memora creates Minds-ready post 
  ↓ 
Creator publishes directly OR copies/opens Minds composer 
  ↓ 
Proof page shows the full memory chain 
 
Minds Outbox Fallback 
If direct Minds publishing/drafting is unavailable, Memora will support: 
Copy Text 
Creator copies the generated Minds-ready post. 
Status becomes copy_ready. 
Open Minds Composer 
App opens Minds composer/share page. 
Creator manually pastes or confirms post. 
Status becomes composer_opened. 
This gives the safest and strongest demo fallback. 
Final Minds Outbox Flow 
Mind generates follow-up post 
  ↓ 
Creator reviews/edits draft 
  ↓ 
If API publish available: 
  → Publish to Minds 
  → Store Minds URL 
If API draft available: 
  → Create Minds draft 
  → Store draft URL/id 
If API unavailable: 


  → Copy text 
  → Open Minds composer 
  → Store fallback proof 
 
Status Values 
Use these outbox statuses: 
draft_generated 
copy_ready 
composer_opened 
draft_created 
published 
failed 
dismissed 
Proof Page Should Show 
The proof page should make this obvious: 
Livestream chat memory 
  → YouTube comment continuity 
  → Mind-generated follow-up 
  → Minds outbox draft 
  → Published URL OR fallback composer/copy proof 
 
Final Implementation Plan Summary 
Build order: 
Minds API discovery spike. 
Fresh Next.js + Supabase app. 
Auth and database schema. 
CSV/demo import. 
YouTube OAuth/comment import. 
Minds memory/reasoning integration. 
Audience memory cards. 
Reply priority queue. 
Follow-up generator. 
Minds outbox with publish/draft/copy/composer fallback. 
Hackathon proof page. 
Tests, polish, build, demo script.
