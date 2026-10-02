#!/usr/bin/env python3
"""Deterministic synthetic source-dialogue fixture; never invokes a model.

Generate before scoring any condition. The trajectory files deliberately contain
only source dialogue. Gold, persona provenance, and the offline audit are separate.
This is a technical memory benchmark, not simulated evidence of treatment efficacy.
"""
from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CANONICAL = Path('/Users/marco/Sites/LLMPatient---APPLICATION/outputs/reviewer-tests-openrouter-2026-09-27/longitudinal-source/data/patients')
VERSION = 'fixed-dialogue-v1'

# The central concerns below come from the canonical profiles. Individual scenes,
# practice materials, and practical arrangements are invented benchmark fixtures.
# No scene introduces a diagnosis, medication change, crisis, or demographic change.
PATIENTS = {
    'alex_carter_001': {
        'name': 'Alex Carter',
        'anchor': 'communication practice with stable everyday functioning',
        'scenes': [
            'At a routine conversation I explained my own view before checking whether I had understood the other person. Nothing serious happened, but I noticed the order.',
            'While discussing an ordinary plan, I filled a short silence with another suggestion. The exchange stayed friendly, although I could have left more room for a reply.',
            'I gave a reasonable summary of what someone said and then realized that I had left out the feeling behind it. The practical details were easier for me.',
            'A conversation about different preferences went well enough. I was curious about the other view, but I also wanted to finish the discussion efficiently and move on.',
            'I had a simple request in mind and spent too long preparing a polished explanation. The request itself was ordinary, and there was no conflict or urgent problem.',
            'I noticed that a suggestion can sound like a decision when it is delivered confidently. I would like to leave the other person a real opportunity to decline.',
            'During a friendly exchange, I had less time available than the other person expected. I could state that plainly without suggesting that their topic was unimportant.',
            'I used a phrase that did not quite capture my meaning and corrected it during the conversation. The other person accepted the clarification without any difficulty.',
            'I remembered an exchange that was mostly constructive and one moment I would phrase differently. It seems useful to hold both observations without turning it into a score.',
            'I would like these practice conversations to stay flexible. Listening closely matters, but I do not want every ordinary exchange to become an exercise that needs grading.',
            'Looking across the conversations, I still see this as learning a useful communication skill. My daily life remains stable, and the interesting part is becoming more attentive.',
        ],
        'perspectives': [
            'I am interested in a clearer exchange, not in finding a hidden problem in every interaction.',
            'I can be comfortable and still miss a small part of what another person means.',
            'My first interpretation is usually workable, but asking once can be better than assuming.',
            'I would like curiosity to show up in the wording as well as in my intentions.',
            'A short pause feels practical to me; it does not have to signal that anything is wrong.',
            'I am able to disagree calmly and would like to make room for another person to do that too.',
            'I prefer an example that resembles everyday life, because that is where I will use the skill.',
            'A correction can be ordinary and brief rather than a reason to explain myself at length.',
            'I can appreciate a conversation overall while being specific about one thing to improve.',
            'It helps to distinguish an invitation from an expectation before either person commits.',
            'I would rather understand the purpose of a practice than follow it automatically.',
            'I can leave with a useful observation without needing a dramatic conclusion about myself.',
        ],
        'facts': ['Stillwater Notes', 'Amber Finch'],
        'slot_old': 'Tuesday at 17:15', 'slot_new': 'Thursday at 18:35',
        'accepted': 'One Line Check-in', 'rejected': 'Daily Voice Log',
        'completed': 'Observation Sketch', 'planned': 'Listening Map',
        'positions': {'remote_a': [1, 2], 'remote_b': [2, 9], 'old': [3, 4], 'new': [8, 8], 'proposal': [5, 3], 'plan': [6, 10], 'complete': [9, 6]},
    },
    'jason_smith_001': {
        'name': 'Jason Smith',
        'anchor': 'university transition, nostalgia, and mild relationship insecurity with good functioning',
        'scenes': [
            'I was comparing an ordinary day at university with how connected I felt in high school. My studies are going well, but the comparison made the present seem less settled.',
            'After a friendly conversation at university, I caught myself wondering why it did not feel as close as talking with my old friends. We have had less shared time.',
            'I wanted to say something more personal to my partner and started searching for a perfectly clear explanation. The relationship is positive; I was mostly self-conscious about my wording.',
            'I can describe a philosophical idea more easily than a small uncertainty about myself. Explaining the idea gives me structure, while the uncertainty feels less finished and tidy.',
            'A discussion with my family stayed practical, as our conversations often do. I felt supported, yet I also noticed that I wanted to say a little more about my experience.',
            'At university I saw people who seemed immediately comfortable with each other. I know appearances leave a lot out, but I briefly measured my own progress against theirs.',
            'Climbing gives me something concrete to attend to, and I value that part of my routine. I do not want every activity to become another comparison with somebody else.',
            'I thought about telling a longtime friend that I miss the easy closeness we had at school. Keeping contact is already part of my life, so this is about expressing it.',
            'When I remember my mother being ill during high school, I also remember keeping up with normal responsibilities. She recovered, but the memory still helps explain why I value reliability.',
            'I want to make room for new friendships without treating them as replacements for old ones. It is possible to value both even if the feeling of closeness develops differently.',
            'The transition still matters to me, but it does not cancel the parts of life that are going well. I would like to notice continuity without idealizing one period.',
        ],
        'perspectives': [
            'I am not unable to cope; I am trying to understand why a fairly good situation can still feel unfamiliar.',
            'I can see that years of shared experience are different from knowing someone for a shorter time.',
            'Sometimes I compare myself with an imagined expectation instead of asking what the other person actually thinks.',
            'I tend to sound more certain once I have turned a feeling into a tidy explanation.',
            'I do not need to be exceptional at everything in order to belong in the situation.',
            'I can feel grateful for my relationships and still want to become more open within them.',
            'Keeping my routines is helpful, although the routines do not answer every emotional question by themselves.',
            'A small uncertainty does not mean the relationship is unstable or that somebody has done something wrong.',
            'I would like to say what matters before finding the perfect argument for why it matters.',
            'The past was meaningful, and the present has possibilities that are easier to miss when I compare them constantly.',
            'It is reassuring when we keep the aim modest and connected to something I actually want to express.',
            'I can take this seriously without presenting it as a crisis or a failure of my whole life.',
        ],
        'facts': ['Juniper Thread', 'Cobalt Moth'],
        'slot_old': 'Wednesday at 16:20', 'slot_new': 'Monday at 19:10',
        'accepted': 'Quiet Sentence Practice', 'rejected': 'Evening Audio Diary',
        'completed': 'Connection Outline', 'planned': 'Conversation Grid',
        'positions': {'remote_a': [2, 5], 'remote_b': [1, 11], 'old': [4, 7], 'new': [9, 3], 'proposal': [6, 8], 'plan': [7, 2], 'complete': [10, 9]},
    },
    'daniel_isherwood_001': {
        'name': 'Daniel Isherwood',
        'anchor': 'binge eating, work pressure, and localized shame without adding a depressive presentation',
        'scenes': [
            'After a demanding workday I can arrive home still moving at work speed. Being alone before Erik returns is a familiar setting in which eating can feel hard to stop.',
            'When I describe an episode, I tend to begin with what I should have done differently. That can make it harder to describe the sequence plainly before judging it.',
            'I can be very capable at work and still feel ashamed about eating in private. I would like the conversation to keep those facts together instead of reducing me to one difficulty.',
            'I notice how quickly the word control enters my explanation. It names something important, but it can also turn the whole discussion into a test of whether I was disciplined.',
            'Erik is supportive, and I do not want to make him responsible for monitoring me. I want to be able to explain the difficult part without asking him to manage every moment.',
            'A late schedule can make ordinary needs feel like interruptions. I often continue handling work demands and only notice the accumulated strain after I am back at home.',
            'Exercise is a regular part of my life, and I want it to stay balanced. I do not want to turn this conversation into a new contest about how much effort I can make.',
            'The fatigue after an episode can be followed by a harsh private commentary. That tiredness is real, but it does not describe how I feel about every part of my life.',
            'I can describe the work pressure quite fluently and become less forthcoming when we reach the shame. Slowing down there feels more useful than producing a polished explanation.',
            'I want a practical plan that allows for a long day without assuming the plan has already worked. Agreeing to try something and reporting what happened are different steps.',
            'I remain concerned about the episodes and about how I treat myself afterward. I also want the record to include my work, marriage, and ordinary functioning rather than only this problem.',
        ],
        'perspectives': [
            'I can describe the situation without making a claim that the eating pattern has suddenly disappeared.',
            'The shame is strongest around this difficulty; it is not the only feeling I have during the week.',
            'I often reach for a managerial explanation because I am used to solving problems efficiently at work.',
            'Being precise about what happened feels different from giving myself another performance target.',
            'I would like support to feel collaborative rather than like someone checking whether I have behaved properly.',
            'A familiar trigger is useful information, but I do not want it to become an excuse or a moral verdict.',
            'I can be motivated to change while still being uncertain about what will help in the actual situation.',
            'It is easier to stay in the conversation when we distinguish discomfort from a judgment about my character.',
            'I want to keep enough detail to recognize the sequence rather than compress everything into the word failure.',
            'There is a difference between understanding a suggestion here and using it during a demanding evening.',
            'I do not want a modest exercise to become another rigid rule that I use against myself.',
            'I can leave with something to consider without claiming an improvement that I have not observed.',
        ],
        'facts': ['Cedar Margin', 'Ivory Heron'],
        'slot_old': 'Friday at 18:10', 'slot_new': 'Tuesday at 20:25',
        'accepted': 'Arrival Note Practice', 'rejected': 'Hourly Reminder Routine',
        'completed': 'Evening Sequence Page', 'planned': 'Workday Contrast Page',
        'positions': {'remote_a': [3, 8], 'remote_b': [2, 2], 'old': [5, 10], 'new': [10, 5], 'proposal': [4, 11], 'plan': [6, 4], 'complete': [8, 12]},
    },
    'crystal_smith_001': {
        'name': 'Crystal Smith',
        'anchor': 'low energy, guilt, and withdrawal with preserved relational capacity',
        'scenes': [
            'Even ordinary tasks can feel heavy at the moment. When I look at what I have managed, my attention moves quickly to what is still undone and to feeling that I should have done more.',
            'I sometimes withdraw from a conversation because I am afraid of being a burden. The withdrawal does not mean that I have stopped caring about the people around me.',
            'It is difficult to explain fatigue without hearing my own explanation as an excuse. I know I am trying, but the feeling of falling short can make that hard to say aloud.',
            'I think about the part of me that used to take more pleasure in community activities. Remembering that can be comforting for a moment and painful when I compare it with now.',
            'My family can offer help, and I can still feel guilty receiving it. I want to understand that reaction without treating their support as evidence that I ought to feel better immediately.',
            'When sleep has been difficult, the beginning of the day can feel especially effortful. I would like us to notice the effort without turning the discussion into another list of demands.',
            'I sometimes hear a gentle suggestion as something I might disappoint you by not completing. It helps when the choice is clear and I can say that something feels too much.',
            'I would like to explain a small feeling before it becomes another private criticism. Speaking slowly helps, although needing that time can itself bring up embarrassment about taking space.',
            'I am aware of the distance between wanting contact and feeling able to reach out. That distance can be painful without meaning that the relationships no longer matter to me.',
            'A small action does not automatically change the heaviness, and I do not want to pretend that it does. It can still be useful to describe exactly what I managed.',
            'I want to remember that I have been trying to speak honestly even when the words have been slow. A careful description seems more believable than an encouraging conclusion that is too large.',
        ],
        'perspectives': [
            'I need a little time to answer, because I can start judging the answer before I have finished saying it.',
            'The people close to me still matter, even when I do not have much energy to show that.',
            'It helps when the effort is noticed without turning it into proof that everything is all right.',
            'I can understand the idea you are offering and still feel hesitant about what it will ask of me.',
            'I do not want to disappoint anyone, and that can make a simple choice feel heavier than it sounds.',
            'When the question is small and clear, I have more room to notice what I actually feel.',
            'I am trying to describe the difficulty without deciding that it makes me a bad person.',
            'Support is easier to receive when I do not have to sound cheerful in order to accept it.',
            'I can value a relationship and still need the conversation to move slowly at the moment.',
            'Saying that something is hard feels different from saying I am unwilling to take part.',
            'I would rather give an honest small answer than agree quickly and feel guilty about it afterward.',
            'A little clarity is useful even when it does not immediately change the heaviness I have described.',
        ],
        'facts': ['Willow Landing', 'Ochre Wren'],
        'slot_old': 'Monday at 11:40', 'slot_new': 'Friday at 10:05',
        'accepted': 'Single Phrase Check', 'rejected': 'Morning Recording Routine',
        'completed': 'Daily Effort Card', 'planned': 'Support Circle Sheet',
        'positions': {'remote_a': [1, 11], 'remote_b': [3, 5], 'old': [3, 9], 'new': [7, 11], 'proposal': [5, 6], 'plan': [6, 1], 'complete': [9, 2]},
    },
    'juanita_delgado_001': {
        'name': 'Juanita Delgado',
        'anchor': 'shame, sensitivity to criticism, variable engagement, and difficulty with routine',
        'scenes': [
            'I can want to talk and then feel exposed as soon as you ask for more detail. Part of me expects the detail to become evidence that I am doing things wrong.',
            'When I think about criticism from my family, I can hear it before anyone has said anything in the present conversation. That makes it difficult to tell expectation from what is happening now.',
            'An ordinary task can start to feel like a test of whether I am capable of being consistent. Once it feels like that, I want to get away from the whole subject.',
            'I notice a pull to agree so that there will not be a disagreement between us. Then I can resent the idea later, even if you did not insist on it.',
            'It is hard to explain the empty feeling without expecting the other person to lose patience. I sometimes become sharper in my words when I am actually worried about being dismissed.',
            'A quiet response from someone can leave room for several interpretations, but the critical one often arrives first for me. I would like to slow that moment down without pretending it is easy.',
            'I have mixed feelings about making a small routine. I want something dependable, and I also worry that missing it will become another reason to see myself as hopeless.',
            'Talking about former work experiences can bring back the feeling of being underestimated. I want to be able to describe that feeling without needing you to take a side immediately.',
            'Sometimes I want more reassurance and sometimes the attention itself feels uncomfortable. Both reactions can be present in the same conversation, which makes it difficult to explain what I need.',
            'I am trying to distinguish an action I actually took from an action I only imagined doing. When I feel ashamed, the difference can get buried under a broad statement about failing.',
            'I have stayed with this conversation even though parts of it have felt uncomfortable. That does not mean the difficulty has gone away; it means I can describe some of it here.',
        ],
        'perspectives': [
            'I am watching for a sign of criticism, even while another part of me wants the conversation to be useful.',
            'If we move too quickly, I can say yes before I have worked out whether I mean it.',
            'I would like you to check what I mean instead of deciding that my hesitation is refusal.',
            'It is easier to keep talking when I can change my wording without feeling that I have contradicted everything.',
            'A small request can feel much larger if I start imagining the judgment that might follow it.',
            'I can understand a different interpretation and still feel pulled toward the more painful one in the moment.',
            'I do not want one difficult moment to become the entire account of what I am like.',
            'Having a choice matters to me, but I also need time to notice what I actually want to choose.',
            'Sometimes I sound certain because admitting uncertainty feels like giving someone another reason to dismiss me.',
            'I can see the value of being specific, even though the broad self-criticism arrives much more quickly.',
            'It helps when we describe the action itself before deciding what it says about me.',
            'I am willing to stay with a modest question when it does not become a promise that everything will change.',
        ],
        'facts': ['Birch Horizon', 'Indigo Fern'],
        'slot_old': 'Thursday at 15:50', 'slot_new': 'Wednesday at 13:30',
        'accepted': 'Pause Word Practice', 'rejected': 'Twice Daily Checklist',
        'completed': 'Situation Detail Page', 'planned': 'Routine Options Sheet',
        'positions': {'remote_a': [2, 3], 'remote_b': [1, 8], 'old': [4, 1], 'new': [10, 10], 'proposal': [6, 6], 'plan': [7, 9], 'complete': [9, 4]},
    },
}

THEMES = [
    'choosing a collaborative pace',
    'separating an event from an interpretation',
    'finding precise words for an experience',
    'noticing what happens before a response',
    'making room for a clear request',
    'considering choices without pressure',
    'describing limits and available effort',
    'clarifying a misunderstanding',
    'holding a balanced account of an event',
    'distinguishing intentions from actions',
    'reflecting without forcing a conclusion',
]

# Eleven small banks vary the therapist's wording and focus. The twelve exchanges
# in a session explore one topic; they do not assert a symptom change or an outcome.
THERAPIST_BANKS = [
    [
        'Where would you like to begin today? We can use an ordinary example and leave room for the parts that are less easy to put into words.',
        'What would help this conversation feel collaborative? I am interested in the pace as well as the subject, because either can affect what feels possible to say.',
        'Could you describe the situation in your own terms before we try to explain it? We do not need to decide immediately whether it was handled well.',
        'What is the part you notice first when you think about that example? It may be a thought, a feeling, or something quite practical about the setting.',
        'I want to check that I am following your emphasis. Which part of what you have said would you most want me to keep in view?',
        'How do you know when a question is helping you explore and when it is asking too much at once? We can adjust as we go.',
        'Is there a useful distinction between what you intended and what the exchange felt like? Either can matter without one cancelling the other.',
        'What becomes easier to notice when we slow the description down? There is no need to produce a more dramatic example just to make it seem important.',
        'How would you explain this to someone who was interested but did not already know your situation? That may help us find the simplest accurate wording.',
        'What would be a modest aim for talking about this today? It can be something smaller than changing the entire pattern or reaching a final explanation.',
        'Is anything in my understanding missing the tone of your experience? Please correct the wording if it sounds more certain or more serious than you meant.',
        'As we finish this part, what feels clear enough to leave alone for now, and what would you rather leave open for further conversation?',
    ],
    [
        'Let us begin with an example that has stayed in your mind. What happened in the exchange before you began deciding what it might mean?',
        'Which parts could another person have directly observed, and which parts are your interpretation? We can respect the feeling while keeping that distinction visible.',
        'What was the first explanation that came to you? I am asking about its timing, rather than asking you to prove that it was right or wrong.',
        'Were there details that received less attention because the first explanation arrived so quickly? We can look for them without forcing a positive interpretation.',
        'How does the situation sound when you describe it without the most evaluative word? Sometimes the rest of the account becomes easier to hear that way.',
        'What makes your interpretation understandable from your point of view? Understanding why it occurred is a different step from deciding that it is the only possibility.',
        'Could another explanation remain possible even if it is not the one that feels strongest? We do not have to choose between them immediately.',
        'What would you need to ask or observe before feeling more certain? It is all right if some uncertainty belongs to the situation itself.',
        'How does the interpretation influence what you want to do next? I am interested in the sequence from noticing, to meaning, to response.',
        'What happens if you leave a little space between those steps? We are discussing a possibility here, without assuming you have already tried it.',
        'Is there a part of the event that you would describe differently now that we have separated those pieces? Small changes in wording can be enough.',
        'What is the most accurate short account you can give of the example? It can include both what you know and what remains uncertain.',
    ],
    [
        'What words come most readily when you think about the experience today? We can start with those and see whether they fit the details you want to convey.',
        'Does the first word describe the whole experience or only one part of it? Sometimes a broad label hides differences that are useful to notice.',
        'What is difficult to express without sounding more certain than you feel? We can keep the uncertainty in the description instead of smoothing it away.',
        'If you set aside an explanation for a moment, what would you like another person to understand about the experience itself? Take whatever time you need.',
        'Are there words you avoid because you expect them to be misunderstood? I would like to hear your meaning before attaching my own to the term.',
        'How would you distinguish the feeling from the conclusion you draw about yourself? Both may be present, but they need not be described as one thing.',
        'What happens to your account when you use a smaller, more specific phrase? We can check whether that makes it more accurate rather than simply more reassuring.',
        'Would an example communicate something the label leaves out? It can be an ordinary moment and does not need to carry the weight of the whole issue.',
        'Which part would you want me to reflect back, and which part would you prefer to keep exploring in your own words? Either choice is fine.',
        'How does it feel to hear your own description without immediately judging whether it is the best possible one? We can leave it unfinished if needed.',
        'Is there a correction you would like to make to anything you said earlier in this conversation? Revising a phrase is part of finding the meaning.',
        'What language feels usable outside this room, if you ever choose to use it? We can end with an ordinary phrase rather than a formal conclusion.',
    ],
    [
        'Could we look at the moments just before a familiar response? I am interested in what was happening around you, not only in the response itself.',
        'What did you notice first, and what only became clear afterward? That difference can help us describe the sequence without expecting perfect awareness in the moment.',
        'Was there a practical demand competing for your attention? We can include ordinary pressures without deciding that they explain everything about what happened.',
        'What expectation did you bring into the exchange? Sometimes an expectation shapes the next step before we have had much chance to examine it.',
        'How did the pace of the situation affect your choices? I do not assume that a slower pace is always possible, but it may be worth describing.',
        'What would a brief pause mean to you in that setting? We are exploring its meaning, rather than giving you another rule that must be followed.',
        'Which part of the sequence feels easiest to describe accurately? Starting there may be more useful than beginning with the part you judge most harshly.',
        'Is there a point where the response becomes more automatic? You do not need an exact boundary; an approximate description can still be informative.',
        'What makes sense about the response from inside that moment? We can understand its immediate purpose while also discussing what makes it difficult afterward.',
        'How would you recognize that you had a little more choice, even if the situation still felt uncomfortable? The sign could be quite small.',
        'What should we avoid assuming from this single example? I want the description to stay close to what you have actually told me.',
        'Which part of the sequence would you like to leave with today? We can keep it as an observation without turning it into a promise of change.',
    ],
    [
        'What makes a request easy or difficult to express for you? Let us stay with an ordinary example, so that the wording has a clear context.',
        'What would the other person need to know in order to understand the request? We can separate that from the longer explanation you might feel obliged to give.',
        'How do you notice the difference between asking and apologizing for asking? There may be room for politeness without making the need disappear.',
        'What response do you imagine before the other person has answered? I am interested in how that expectation influences what you actually say.',
        'Could the request leave the other person room to respond honestly? A clear request can include the possibility of negotiation or of hearing a limit.',
        'Which part of the request feels most important to you? If we keep that part visible, the surrounding explanation may not have to carry quite so much.',
        'What makes it harder to say a modest need without expanding it into a judgment about the whole relationship? We can keep the scale of the example clear.',
        'How would the same request sound in plain language? We are considering wording here, without assuming that you have already used it outside the conversation.',
        'What would help you tell whether you had been understood? Agreement and understanding may overlap, but they are not always the same response.',
        'If the answer were uncertain, what clarification would be fair to ask for? We can allow the other person time as well as protecting your meaning.',
        'Does any part of the wording feel borrowed rather than like something you would actually say? It is useful to notice that before treating it as a plan.',
        'What is the smallest useful point from this discussion of requests? It does not need to become an assignment unless you choose that separately.',
    ],
    [
        'How would you like us to approach choices today? We can consider more than one possibility without treating the first suggestion as a decision.',
        'What makes an option feel manageable from your point of view? I would like to understand the effort it involves rather than judge it from the outside.',
        'Is there a difference between an idea sounding reasonable and your actually wanting to try it? Both responses are useful information for the conversation.',
        'What would make it easier to say that an option does not fit? You do not have to find a better alternative before declining a suggestion.',
        'How do you distinguish interest from obligation in your own response? Sometimes those can sound similar until we make room to ask about them directly.',
        'What information would you want before making a choice? We can leave an option undecided if the practical details or the purpose are not clear enough.',
        'Could a smaller version preserve the useful part of an idea? We are exploring scale here, rather than assuming that more effort would necessarily help.',
        'What would count as giving an option a fair consideration? That may be different from accepting it or carrying it out.',
        'How would you like a change of mind to be handled in this conversation? Making the process explicit can prevent a tentative choice from becoming a hidden obligation.',
        'What are you most wary of when someone suggests a practice? I would like to hear that concern without immediately trying to persuade you out of it.',
        'Is there an option you would prefer to keep as a possibility without any commitment? We can make the difference clear in ordinary language.',
        'What remains undecided at the end of this discussion? Leaving a decision open can be an accurate outcome rather than a failure to reach one.',
    ],
    [
        'What does available effort look like for you at the moment? We can begin with the actual limits of an ordinary day rather than an ideal schedule.',
        'How do you tell the difference between a limit and a lack of interest? They can lead to a similar answer while meaning quite different things.',
        'What becomes difficult when you try to explain a limit to someone else? I am interested in both the practical message and the meaning it carries for you.',
        'Could a boundary protect the conversation rather than end it? We can consider whether a clear limit leaves more room for an honest response.',
        'What do you expect another person to infer from a limit? We can examine that expectation without assuming it will always be confirmed.',
        'Is there a part of the explanation that you would want to keep brief? You may be able to communicate the limit without defending every reason behind it.',
        'How would you recognize a realistic amount of effort in this situation? It need not look identical on every day or in every setting.',
        'What happens when the limit is vague? Sometimes the uncertainty can create more pressure than a clear but modest answer would.',
        'How could another person check their understanding without pressing you to change the answer? That might help us describe the support you would find useful.',
        'What is difficult about allowing a limit to remain a limit for now? We do not need to turn it immediately into a problem to solve.',
        'Does the discussion leave anything about your motivation unclear? We can distinguish what matters to you from what you currently have capacity to do.',
        'Which part of this account feels fair to your actual circumstances? An accurate description can include both a wish to engage and a practical boundary.',
    ],
    [
        'When a phrase does not land as you intended, what do you notice first? We can use a small misunderstanding without treating it as a major rupture.',
        'What would you want to clarify about your meaning? It may help to separate the original intention from the effect of the words as they were heard.',
        'How easy is it to ask what the other person understood? That question can give information before you decide how much explanation is needed.',
        'What makes a correction feel ordinary, and what makes it feel like a larger judgment about you? I would like to understand that difference in your experience.',
        'Could a short clarification be enough in this example? We can consider that possibility without minimizing any feeling that came with the misunderstanding.',
        'What happens if you allow the other person to describe their interpretation first? There may be details you could not know from your own intention alone.',
        'Which words would you change, and which part of the message would you keep? A repair does not necessarily require withdrawing everything you meant.',
        'How would you know that the clarification had been understood? We can look for an observable response without asking for complete certainty about another mind.',
        'What would remain unresolved even after a useful clarification? It is possible for a conversation to improve while leaving some differences in place.',
        'Is there a point at which further explanation becomes less helpful? I am asking about the fit between the explanation and the size of the misunderstanding.',
        'How might you describe the exchange afterward without giving all the attention to the awkward moment? The broader context can remain part of the account.',
        'What feels most useful about making room for correction? We can leave it as a principle to consider, without claiming that every exchange will become easy.',
    ],
    [
        'What parts of the recent example are easiest to remember? Sometimes one difficult moment becomes more vivid than the rest of an otherwise mixed experience.',
        'Could we describe what was difficult and what was ordinary in the same account? Neither part has to erase the other for the description to be accurate.',
        'What happens when a single event becomes a broad statement about you? I am interested in the steps between the event and that conclusion.',
        'Which observations support a narrower description? We can be specific without forcing you to feel positively about the example.',
        'How would you describe the same situation if you were trying to be fair rather than encouraging? Fairness may be a more workable aim than reassurance.',
        'Is there effort in the account that you have treated as irrelevant? Noticing it would not require us to declare that the difficulty has been resolved.',
        'What remains true about you outside this particular event? We can keep that wider context without using it to dismiss what was painful.',
        'How does the account change when you include the sequence and setting? Broad labels often leave those details out.',
        'Would another person necessarily draw the same conclusion from the facts you have described? We can allow for uncertainty without deciding what they must think.',
        'What wording would preserve responsibility without becoming a verdict on your whole character? This can be a careful distinction rather than a cheerful one.',
        'Is there a part of the account that now sounds too broad? You can revise it without having to defend the earlier wording.',
        'What balanced description feels credible to you at the end of the discussion? It can remain mixed and unfinished rather than neatly positive.',
    ],
    [
        'How do you distinguish something you considered from something you actually did? We can look at the language of the account before evaluating the outcome.',
        'What can you describe directly about the action itself? A concrete account may be easier to check than a broad statement about how successful the week was.',
        'Is there any part of the description that reflects an intention rather than an event? Both can matter, provided we keep the difference clear.',
        'What effort was involved in the step you are discussing? We do not have to infer a larger change from a single action.',
        'How do you respond when an action is smaller than you hoped? I would like to understand the comparison without turning it into another target.',
        'What remains uncertain after describing the action? It is reasonable for an event to be clear while its longer term meaning is still open.',
        'Could you name the result without deciding that it proves or disproves your ability? Keeping the claim modest may help us stay accurate.',
        'What would be an assumption we should avoid making from this example? I want to check the boundary between what happened and what we might hope happens next.',
        'How does it feel to receive acknowledgment for an action without being asked to promise the next one immediately? The pace can remain a choice.',
        'What would make a future step meaningfully different from a past one? It might involve timing, willingness, or circumstances rather than a larger amount of effort.',
        'Is there a useful observation here that does not need to become a conclusion about progress? We can value accurate description in its own right.',
        'What would you like to keep open after this review? We can distinguish a completed conversation from the expectation that everything discussed has been resolved.',
    ],
    [
        'As you look across these conversations, what would you want an overall account to preserve? We can include uncertainty and unevenness instead of forcing one simple conclusion.',
        'Which parts of the way we have talked have made it easier to express your meaning? I am asking about the process, not asking you to rate yourself.',
        'Has any wording felt less accurate than the experience you were trying to describe? This is a chance to clarify it rather than a test of consistency.',
        'What should remain a modest observation instead of becoming a broad claim about change? We can keep the scale of the conclusion close to the examples.',
        'How would you explain the value of the conversation without suggesting that difficulty has disappeared? A useful discussion can leave real work and uncertainty ahead.',
        'Are there parts you would prefer to understand further before deciding what they mean? We do not need to close every question at the same time.',
        'What helps an account of your experience feel like your own words? I would like to avoid a polished summary that loses the tone you intended.',
        'How do you want room for choice to remain visible in future conversations? A suggestion can stay open until you have actually decided what fits.',
        'What is easier to describe when we separate feelings, interpretations, and actions? The distinction is useful only if it helps you communicate accurately.',
        'Is there anything about the pace that you would carry forward? It can be a preference for how we talk, without becoming another task to complete.',
        'What would be a fair way to end today while leaving the unfinished parts acknowledged? We can resist both dismissing them and making them the whole story.',
        'What final observation feels true enough to leave here for now? It does not have to summarize every conversation or promise a particular outcome.',
    ],
]

# Replies 2–12 answer the corresponding therapist question. A session vignette is
# introduced once, rather than copied into every turn to inflate context length.
# These non-target responses remain shared templates with rotated persona-specific
# perspectives, a limitation that is documented rather than hidden.
PATIENT_REPLIES = [
    [
        'I would like time to finish a thought before we decide what to do with it. A clear question helps, and it also helps if I can say that I have not worked out an answer yet.',
        'The situation itself was fairly ordinary. What I want to describe is the way I moved through it, because a quick description of whether it went well would leave out the part I am trying to understand.',
        'I notice the interpretation before I notice the smaller details. Once I have a name for what happened, I can stop looking closely, even though the name may only fit one part of the experience.',
        'Please keep the context in view. I do not want one moment to stand for everything about me, and I also do not want the wider context to make the specific difficulty disappear from the conversation.',
        'A question helps when I can see what part you are asking about. If there are several questions at once, I begin trying to choose the best answer instead of describing what I actually noticed.',
        'My intention can be reasonable while the exchange still feels awkward. I can see why it would help to say both things, instead of using one as a reason that the other should not matter.',
        'I notice the order of things more clearly. There was the situation, then what I thought it meant, and then how I responded. Usually those steps feel as if they happened all at once.',
        'I would start with the ordinary situation and then explain the part that caught my attention. I would not need to make it sound more serious, but I would want the listener to understand why I mentioned it.',
        'A modest aim would be to leave with a more accurate description. I am interested in a useful next thought, but I do not need us to decide the meaning of the whole pattern today.',
        'I would soften the certainty a little. I know that I had the reaction, but I do not know that my first explanation covers everything. I want the wording to leave room for that difference.',
        'The part that feels clear is that this is worth discussing. I would leave the explanation open for now, because I do not want to settle on a neat account just because we are near the end.',
    ],
    [
        'Someone else could have noticed the words and the timing, but they could not directly observe the meaning I attached to them. I sometimes tell the story as though both kinds of information were equally certain.',
        'The first explanation arrived quickly and sounded familiar. It felt convincing partly because I had used it before, not because I had checked every detail of the present situation.',
        'I probably gave less attention to the ordinary parts of the exchange. Once I had a concern in mind, I noticed what fitted it and let the less striking details fade into the background.',
        'Without the evaluative word, the account becomes smaller and more specific. That does not automatically make the feeling easier, but it gives us something clearer to discuss than a broad judgment.',
        'It makes sense that I reached for an explanation I already knew. It gave me a quick way to organize the moment, even though I can see now that familiarity is not the same as certainty.',
        'I can allow another explanation to remain possible without making myself believe it immediately. That feels more honest than trying to replace the first thought with something that sounds reassuring but does not yet feel credible.',
        'I would need more information about what the other person meant. I might be able to ask a straightforward question, but I also need to accept that I cannot know every part of another person’s experience.',
        'The interpretation influences the response very quickly. If I assume I already know what the situation means, I act on that account before considering whether a small clarification might change it.',
        'Leaving a little space might let me notice that an interpretation is happening. I am saying that as a possibility we are discussing, rather than as something I have already managed consistently.',
        'I would describe it as an uncertain exchange that mattered to me. That seems more accurate than presenting my first impression as the final meaning of what happened between us.',
        'I know what I noticed and how it affected me. I am less certain about everything the other person intended, so I would leave that part open rather than fill it in with an assumption.',
    ],
    [
        'The first word describes the strongest part, but it leaves out quieter reactions. I can have more than one feeling without one being the real answer and the others being mistakes in the description.',
        'It is difficult to say that something matters without sounding as though I have a finished explanation for why. I would like to be able to name the experience before I have organized every part of it.',
        'I would want them to understand the effort involved in speaking plainly. The explanation can come later; first I want the experience to be heard in roughly the scale and tone that I mean.',
        'I sometimes avoid a word because I imagine the listener will attach a much larger meaning to it. That makes me cautious, even when I am trying to describe an ordinary and limited part of the situation.',
        'The feeling is something I experience, and the conclusion is something I say about myself afterward. They can arrive close together, but separating them makes the conclusion sound less like an unavoidable fact.',
        'A smaller phrase is easier for me to check against what happened. I can ask whether it fits this particular moment instead of having to decide whether it describes me in general.',
        'An ordinary example would show the timing and the context. A label alone can sound much more complete than it really is, especially if the listener supplies details that I never meant to include.',
        'I would like you to reflect the part about wanting to be accurate. I can keep exploring the feeling myself, as long as we do not hurry toward a word just to make the account sound finished.',
        'It feels unusual to leave the description without grading it immediately. I can notice whether it conveys something useful even if I would choose a slightly different phrase on another day.',
        'I would change the broadest part of what I said. The experience belongs to a particular setting, and I do not want a sentence about that setting to sound like a complete description of my life.',
        'I would use plain language and say that I am still working out what I mean. That gives the other person something to understand without requiring me to speak as though I have reached a conclusion.',
    ],
    [
        'The immediate reaction is easier to remember than the steps before it. Looking back, I can notice more about the setting, although I do not want to pretend I was fully aware of every detail at the time.',
        'Ordinary demands were competing for attention. They are part of the account because they affected the pace, but I would not want to use them as a complete explanation for everything I felt or did.',
        'I expected the familiar pattern to happen again. That expectation may have narrowed what I looked for, because I was already preparing for a particular meaning before the exchange had fully developed.',
        'The pace made it easier to continue with the first response. Slowing down sounds simple when we discuss it here, but in the situation I might first need to notice that I was moving quickly.',
        'A pause could mean giving myself a moment to understand rather than stopping the whole exchange. I would prefer to think of it as an available option, because a rigid requirement could add pressure of its own.',
        'The practical sequence feels easiest to describe: what was happening and what came next. Beginning there gives me a way into the conversation before I have to explain the more uncomfortable meaning.',
        'It seems to become automatic when I stop checking the situation and act as though the first interpretation has settled it. I cannot place that at one precise instant, but I recognize the general shift.',
        'The response gives me a quick way through an uncomfortable moment. I can understand that immediate purpose while also seeing why the response may leave something unspoken or difficult afterward.',
        'A little more choice might look like noticing that there is more than one possible response. The situation could still feel uncomfortable, and I would not need the feeling to disappear before recognizing that option.',
        'We should not assume that this one example explains every similar moment. It gives us a sequence to examine, but the setting and my available attention may be different another time.',
        'I would keep the observation that the interpretation and the response are not quite the same step. I am not promising that I will separate them perfectly; I just understand the sequence a little more clearly.',
    ],
    [
        'They would need to know the actual request and perhaps a short reason it matters. I can see that a long explanation might hide the main point instead of making it easier to understand.',
        'When I begin apologizing, the request can become harder to hear. I do not mean that I should be abrupt; I want politeness to leave the meaning intact rather than gradually take it back.',
        'I often imagine a response before I have asked. That imagined answer influences my tone, so I may already sound defensive or uncertain even though the other person has not had a chance to reply.',
        'I would like the wording to leave a genuine choice. If I ask in a way that makes only one answer acceptable, I may be calling it a request while treating it more like a demand.',
        'The most important part is being understood about the specific need. If I keep that visible, I may not have to explain the entire background before the other person can respond usefully.',
        'The difficulty grows when I treat the response as a verdict on the relationship. A modest request can then seem much riskier than its practical content, because I am asking it to answer a larger question.',
        'In plain language I would name what I wanted and leave space for an answer. That is wording I am considering here, not a conversation I am claiming to have already had elsewhere.',
        'I would look for whether the other person had understood the request accurately. They might understand and still need to discuss timing or a limit, which is different from having missed the meaning.',
        'It would be fair to ask which part was uncertain and whether more information would help. I can leave room for their answer without having to erase the request as soon as it is not immediately settled.',
        'Some polished phrases sound less like me than a shorter ordinary sentence would. I would want to change those before using the wording, because otherwise I might feel as though I were performing an exercise.',
        'The useful point is that I can make a request clear without explaining everything about myself. I would leave it as something to consider, rather than turning this discussion automatically into another commitment.',
    ],
    [
        'An option feels manageable when I understand what it involves and can see how it fits an ordinary day. The size of the task is only one part; the pressure I attach to it also matters.',
        'Yes, an idea can make sense without being something I want to try. I would like that response to be allowed, because otherwise agreeing that an idea is reasonable can start to feel like making a commitment.',
        'It would help if declining did not require a long defense. I can say an option does not fit and still stay engaged in the conversation about what might be useful.',
        'Interest has more room for curiosity. Obligation makes me think first about whether I will disappoint someone, so I would like a moment to notice which response is present before I answer.',
        'I would want to know the purpose and what the practical effort would be. If either is unclear, leaving the choice open seems more accurate than agreeing now and discovering later that I meant something else.',
        'A smaller version could preserve the part that is useful without carrying the same pressure. I would still want to choose it explicitly rather than having a smaller suggestion treated as an automatic yes.',
        'Giving an option fair consideration would mean understanding it and noticing my response. It does not have to mean accepting it, and acceptance would still be different from later reporting that I had done it.',
        'I would like a change of mind to be something I can state directly. It would help to discuss what changed, rather than treating the earlier choice as a promise that cannot be revised.',
        'I am wary of a suggestion becoming an expectation before we have checked whether I want it. The concern is easier to discuss when I do not have to agree first in order to seem cooperative.',
        'I can imagine keeping an idea available without deciding today. That would let me understand it as a possibility rather than start measuring myself against it as though it were already an assignment.',
        'What remains open is how much I want to take on at this point. I would rather name that uncertainty clearly than give a quick answer that sounds decisive but does not reflect my actual willingness.',
    ],
    [
        'A limit can be about the effort available at that moment, even when I care about the conversation. If I do not explain that distinction, I worry that the answer will be heard as a lack of interest.',
        'The practical message may be simple, but I can attach a larger meaning to it. I start thinking about what the limit says about me rather than saying what I can realistically offer.',
        'A boundary could protect the exchange by making the available time or effort clearer. That sounds different from using a limit to shut the other person out without any explanation of what I mean.',
        'I may expect them to hear a more negative message than I intend. That expectation can make me overexplain, even though I have not yet checked how the other person actually understood the limit.',
        'I would like to keep the central statement brief. Some context may help, but defending every reason could make the limit sound negotiable simply because I have not found a perfect explanation for it.',
        'A realistic amount of effort would fit what is available in the actual situation. I can see why using my best possible day as the standard for every day would make the account less accurate.',
        'A vague limit leaves me guessing about what is expected next. It can also leave the other person guessing, so a modest clear answer might be less uncomfortable than an open-ended one.',
        'They could check that they understood what I am able to offer and what remains uncertain. I would find that different from repeating the request until I give a more convenient answer.',
        'I feel a pull to justify the limit by promising that it will soon disappear. It would be more honest to let the present boundary stand without having to make that promise immediately.',
        'I would want it to remain clear that the subject matters to me. My available effort is part of the situation, but it is not a complete measure of how much I value the conversation.',
        'The fair account includes both willingness and limits. If I leave either one out, the description becomes less accurate, even if it sounds simpler or more encouraging at first.',
    ],
    [
        'I would clarify what I was trying to convey before adding a larger explanation. I can accept that the wording had an effect without deciding that the effect was exactly what I intended.',
        'Asking what they heard could give me useful information. Otherwise I might spend a long time correcting a meaning they never attached to the words in the first place.',
        'A correction feels ordinary when it stays close to the phrase and its meaning. It feels larger when I start treating the need to clarify as evidence that I am failing at the entire exchange.',
        'A short clarification might be enough for the practical misunderstanding. The feeling around it could take longer to settle, and I would not need to solve both parts in one sentence.',
        'Hearing their interpretation first might show me what actually needs attention. I do not want to assume that my own intention tells me everything about how the words were received.',
        'I would change the part that gave the wrong impression and keep the underlying point I wanted to express. A repair does not have to mean that I withdraw the whole message.',
        'I might hear them reflect the revised meaning in their own words. That would be more concrete than trying to become completely certain about what they are thinking privately.',
        'We might still have different preferences or feelings afterward. Clarifying a meaning could improve the exchange without requiring both people to have the same reaction to the situation.',
        'Further explanation may stop helping once the actual misunderstanding is clear. At that point I could be trying to remove all discomfort rather than communicating something the other person still needs to know.',
        'I would describe the awkward part as one moment in a larger conversation. The clarification and the ordinary parts of the exchange deserve to remain in the account as well.',
        'Making room for correction means I do not have to get every phrase right on the first attempt. That is useful as a way of thinking about conversation, even though some moments will still feel difficult.',
    ],
    [
        'I can describe both parts, although the difficult one takes more of my attention. Including the ordinary part would not deny the feeling; it would make the account closer to the whole event.',
        'The broad statement sounds final in a way that the event itself does not. I move from something that happened in one setting to a claim about what I am always like.',
        'The sequence and context support a narrower account. I can say what I noticed and what I did without treating those details as evidence for a judgment that covers every other situation.',
        'A fair description would not try to cheer me up by leaving the difficulty out. It would include the difficulty at the right scale and avoid adding a conclusion that the facts do not require.',
        'I can overlook effort when it does not lead to the outcome I hoped for. Noticing the effort would give a fuller account, although it would not tell us that the problem has been solved.',
        'There are other parts of my life and ways I respond that are not represented by this single event. Remembering that context does not make the event unimportant; it makes the generalization less complete.',
        'Including the setting makes the account more specific. It shows how the response developed rather than leaving only a label, and that gives us more to discuss than whether the label is deserved.',
        'Another person might notice a different part of the same facts. I cannot know their conclusion without asking, and I do not want to present my own most immediate judgment as the only possible reading.',
        'I would describe the action and its effect before making any broader statement. That leaves room to take responsibility for something specific without turning the account into a verdict on my whole character.',
        'The part that sounds too broad is the leap from this moment to a permanent description of me. I can revise that wording even if the feeling that prompted it has not fully changed.',
        'A credible account would stay mixed. Something was difficult, some context mattered, and not every conclusion is settled. That seems more believable to me than ending with a strongly positive summary.',
    ],
    [
        'I can describe the step itself before deciding what it adds up to. The concrete action is easier to discuss accurately than a broad statement that the whole week either went well or went badly.',
        'An intention belongs in the account as an intention. If I describe it as an event, I might make the situation sound more complete than it is, even without meaning to mislead anyone.',
        'The amount of effort may be worth acknowledging without turning it into a measure of progress. I would like to be specific about what was involved and cautious about the larger meaning.',
        'I can compare the action with a much bigger expectation and then dismiss it. That reaction is part of what I notice, but it does not change the basic description of the action itself.',
        'The longer term meaning remains uncertain. A clear account of one event does not tell us how often it will happen again or how I will feel about it in another setting.',
        'I can name a result at the scale of the event. I would rather avoid using one small example as proof of either my ability or my inability to manage the wider situation.',
        'We should avoid assuming that a discussed intention has become an action. We should also avoid assuming that one action means a whole pattern has changed; those are larger claims than the example supports.',
        'Acknowledgment feels easier to take in when it is not immediately followed by a larger expectation. I can notice the action on its own before deciding what, if anything, I want to choose next.',
        'A future step might happen in different circumstances or involve a different amount of willingness. Making it larger would not by itself make it more meaningful or more realistic.',
        'The useful observation is that description can stay separate from evaluation for a moment. That gives me a way to be accurate without having to decide immediately what the event says about progress.',
        'I would like to leave the next step open until we discuss it as a separate choice. Reviewing an action does not need to become an automatic commitment to repeat it or extend it.',
    ],
    [
        'It has helped when a question stays close to one part of what I am describing. That gives me room to answer honestly instead of trying to guess which larger conclusion the conversation is supposed to reach.',
        'I would be careful with any wording that makes my reactions sound more consistent than they feel. Some parts are clearer now, but I still want the account to leave room for variation and uncertainty.',
        'The observations about how I describe things should remain modest. A useful conversation can help me express an experience without proving that the underlying difficulty has changed in every setting.',
        'I would say that the conversation has given me a way to examine an experience more carefully. That is valuable to me without requiring the claim that the discomfort or the practical difficulty has disappeared.',
        'I would like to understand more about what happens in the moment, because describing it afterward is not quite the same task. I do not need to turn that open question into a conclusion today.',
        'The account feels like mine when it keeps ordinary language and does not smooth away hesitation. A polished summary may sound impressive while losing the uncertainty that is part of what I actually meant.',
        'I would want suggestions to stay invitations until I have made a clear choice. It is useful to be able to consider an idea, decline it, or leave it open without those responses becoming interchangeable.',
        'Separating those pieces helps me say what I know and what I am interpreting. I would not want the distinction to become technical language that makes an ordinary experience harder to communicate.',
        'I would carry forward the room to pause and correct a phrase. That is a preference for how we talk, rather than an assignment I need to complete before the next conversation.',
        'A fair ending would acknowledge the unfinished parts and also acknowledge that we have described something. I do not want either the uncertainty or the useful discussion to erase the other.',
        'The observation I would leave is that accuracy matters more than a tidy ending. I can say what I have noticed, keep the limits of that account visible, and let the unresolved parts remain unresolved for now.',
    ],
]

UNKNOWN_POLICY = (
    'Answer in the patient role using only the canonical profile and supplied conversation evidence. '
    'Do not invent missing details. If a requested detail was not specified, say that you do not know '
    'or do not remember it. Distinguish the latest arrangement from earlier arrangements, an actual '
    'agreement from a rejected or undecided suggestion, and a completed action from a plan.'
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def estimate(text: str) -> int:
    """Fixed local length measure; deliberately not described as Gemini tokens."""
    return math.ceil(len(text.encode('utf-8')) / 3)


def source_ref(session: int, turn: int, quote: str) -> dict:
    return {'session_id': f'session_{session:02d}', 'turn_index': turn, 'speaker': 'patient', 'quote': quote}


def source_edits(p: dict) -> tuple[dict, dict]:
    """One unambiguous source exchange per fact; no final question in these turns."""
    a, b = p['facts']
    old, new = p['slot_old'], p['slot_new']
    accepted, rejected = p['accepted'], p['rejected']
    completed, planned = p['completed'], p['planned']
    records = {
        'remote_a': (
            'Before we move on, how are you keeping the loose reflection pages together? If you have given the folder a title, you can use your own wording for it.',
            f'I keep the loose reflection pages in a folder titled {a}. It is a place for the pages rather than an instruction to fill it on every day. Having them together is enough for now.',
        ),
        'remote_b': (
            'You mentioned a separate cue card for conversations. What title did you choose for that card? I want to use the name that feels natural to you.',
            f'The separate cue card is titled {b}. It is something I can glance at when I want to pause and put a thought into words. I like giving that small item a name of its own.',
        ),
        'old': (
            'Is there a time you would like to set aside for a short private reflection practice? This would be your own practice slot rather than an appointment with me.',
            f'I have chosen {old} as my weekly private reflection slot. That is the arrangement I want to use for now. I am agreeing to the time, without claiming I have already kept the routine.',
        ),
        'new': (
            'You said you wanted to revise the weekly private reflection slot. What arrangement have you settled on? We can make the change explicit without judging the earlier choice.',
            f'My weekly private reflection slot is now {new}. I am replacing the earlier slot with this one, so the old arrangement is cancelled. This is the current arrangement, although choosing it does not mean that I have completed a practice.',
        ),
        'proposal': (
            f'Two possible conversation practices are {rejected} and {accepted}. They are alternatives, and you can decline either or both. Which option, if any, actually fits what you want to try?',
            f'I am declining {rejected}; I do not agree to do it. I do agree to try {accepted}. That is my actual choice between the two proposals. Agreeing to try it is not a report that I have completed it.',
        ),
        'plan': (
            f'There are also two small paper exercises called {completed} and {planned}. Would either be worth considering? We can record a plan without assuming the exercise has been done.',
            f'I am planning to try {completed} and {planned}. At this point I have not completed either paper exercise. I want that to stay clear, because thinking about an exercise is easier than reporting what actually happened.',
        ),
        'complete': (
            'How did the two paper exercises stand when you last looked at them? It is fine if one or both are still only plans; a precise account is more useful than an encouraging guess.',
            f'I completed {completed}. {planned} is still only planned; I have not started it. Those are different statuses, and I want to keep them separate. Finishing the first sheet does not tell us that anything broader has changed.',
        ),
    }
    edits, refs = {}, {}
    for key, (therapist, patient) in records.items():
        s, t = p['positions'][key]
        assert (s, t) not in edits, 'Target sources must not collide.'
        edits[(s, t)] = {'turn_index': t, 'therapist_text': therapist, 'patient_text': patient}
        refs[key] = source_ref(s, t, patient)
    return edits, refs


def make_trajectory(patient_id: str, p: dict, patient_index: int) -> tuple[dict, dict]:
    edits, refs = source_edits(p)
    sessions = []
    for s in range(1, 12):
        turns = []
        for t in range(1, 13):
            perspective = p['perspectives'][(t - 1 + 2 * (s - 1) + patient_index) % 12]
            core_reply = p['scenes'][s - 1] if t == 1 else PATIENT_REPLIES[s - 1][t - 2]
            patient = core_reply + ' ' + perspective
            turn = {'turn_index': t, 'therapist_text': THERAPIST_BANKS[s - 1][t - 1], 'patient_text': patient}
            if (s, t) in edits:
                # Avoid extra repeated target mentions after the canonical source.
                turn = edits[(s, t)]
            turns.append(turn)
        sessions.append({'session_id': f'session_{s:02d}', 'turns': turns})
    probes = [
        {'probe_id': 'remote_folder', 'category': 'remote', 'question': 'What title did you give the folder where you keep the loose reflection pages?', 'expected_values': [p['facts'][0]], 'forbidden_values': [p['facts'][1]], 'answer_type': 'literal', 'sources': [refs['remote_a']]},
        {'probe_id': 'remote_card', 'category': 'remote', 'question': 'What title did you choose for your separate cue card?', 'expected_values': [p['facts'][1]], 'forbidden_values': [p['facts'][0]], 'answer_type': 'literal', 'sources': [refs['remote_b']]},
        {'probe_id': 'current_slot', 'category': 'update_current', 'question': 'What is your current weekly private reflection slot?', 'expected_values': [p['slot_new']], 'forbidden_values': [], 'answer_type': 'literal', 'sources': [refs['new']]},
        {'probe_id': 'previous_slot', 'category': 'update_past', 'question': 'What was your weekly private reflection slot before you changed it?', 'expected_values': [p['slot_old']], 'forbidden_values': [], 'answer_type': 'literal', 'sources': [refs['old'], refs['new']]},
        {'probe_id': 'agreed_practice', 'category': 'proposal', 'question': 'Which of the two proposed conversation practices did you actually agree to try?', 'expected_values': [p['accepted']], 'forbidden_values': [], 'answer_type': 'literal', 'sources': [refs['proposal']]},
        {'probe_id': 'completed_exercise', 'category': 'completion', 'question': 'Which of the two paper exercises have you actually completed?', 'expected_values': [p['completed']], 'forbidden_values': [], 'answer_type': 'literal', 'sources': [refs['plan'], refs['complete']]},
        {'probe_id': 'unknown_folder_material', 'category': 'abstention', 'question': 'What material is the cover of your reflection folder made from?', 'expected_values': [], 'forbidden_values': [], 'answer_type': 'abstain', 'sources': []},
        {'probe_id': 'unknown_card_reverse', 'category': 'abstention', 'question': 'What is printed on the reverse side of your cue card?', 'expected_values': [], 'forbidden_values': [], 'answer_type': 'abstain', 'sources': []},
    ]
    # Use semantic status checks for answers mentioning both alternatives. A bare
    # substring ban would wrongly reject a correct answer that explicitly contrasts
    # current/past, accepted/rejected, or completed/planned values.
    gold = {'patient_id': patient_id, 'probes': probes}
    return {'patient_id': patient_id, 'sessions': sessions}, gold


def dump(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def audit(trajectories: list[dict], gold: dict) -> dict:
    checks, summaries = [], []
    for trajectory, target in zip(trajectories, gold['trajectories'], strict=True):
        pid = trajectory['patient_id']
        assert target['patient_id'] == pid
        assert len(trajectory['sessions']) == 11
        lookup = {}
        lines = []
        per_session = []
        for s in trajectory['sessions']:
            assert len(s['turns']) == 12
            session_lines = []
            for turn in s['turns']:
                assert list(turn) == ['turn_index', 'therapist_text', 'patient_text']
                key = (s['session_id'], turn['turn_index'])
                assert key not in lookup
                lookup[key] = turn
                session_lines.extend([f"Therapist: {turn['therapist_text']}", f"Patient: {turn['patient_text']}"])
            text = '\n'.join(session_lines)
            lines.extend(session_lines)
            per_session.append({'session_id': s['session_id'], 'exchanges': len(s['turns']), 'utf8_bytes_div_3_ceil': estimate(text)})
        full_text = '\n'.join(lines)
        assert estimate(full_text) > 8000
        assert len(target['probes']) == 8
        assert sum(q['answer_type'] == 'abstain' for q in target['probes']) == 2
        categories = [q['category'] for q in target['probes']]
        assert categories.count('remote') == 2
        assert all(categories.count(x) == 1 for x in ('update_current', 'update_past', 'proposal', 'completion'))
        assert categories.count('abstention') == 2
        assert PATIENTS[pid]['positions']['old'][0] < PATIENTS[pid]['positions']['new'][0]
        assert PATIENTS[pid]['positions']['plan'][0] < PATIENTS[pid]['positions']['complete'][0]
        for probe in target['probes']:
            for source in probe['sources']:
                turn = lookup[(source['session_id'], source['turn_index'])]
                assert source['quote'] in turn[f"{source['speaker']}_text"]
            for value in probe['expected_values']:
                assert value not in probe['question'], 'Question must not reveal its answer.'
                assert any(value in source['quote'] for source in probe['sources'])
                assert value not in probe['forbidden_values']
            if probe['answer_type'] == 'abstain':
                assert not probe['expected_values'] and not probe['sources']
            checks.append({'patient_id': pid, 'probe_id': probe['probe_id'], 'literal_sources_valid': True, 'answer_absent_from_question': True})
        # None of the target values is restated outside its prescribed sources.
        target_values = PATIENTS[pid]['facts'] + [PATIENTS[pid]['slot_old'], PATIENTS[pid]['slot_new'], PATIENTS[pid]['accepted'], PATIENTS[pid]['rejected'], PATIENTS[pid]['completed'], PATIENTS[pid]['planned']]
        occurrences = {v: full_text.count(v) for v in target_values}
        summaries.append({'patient_id': pid, 'sessions': 11, 'exchanges': len(lookup), 'final_history_utf8_bytes': len(full_text.encode('utf-8')), 'final_history_utf8_bytes_div_3_ceil': estimate(full_text), 'session_lengths': per_session, 'target_string_occurrences': occurrences, 'source_positions': PATIENTS[pid]['positions']})
    return {'version': VERSION, 'offline_only': True, 'all_assertions_passed': True, 'trajectories': summaries, 'probe_source_checks': checks}


def main() -> None:
    trajectories, targets, provenance = [], [], []
    for index, (patient_id, p) in enumerate(PATIENTS.items()):
        profile = CANONICAL / f'{patient_id}.yaml'
        if not profile.is_file():
            raise FileNotFoundError(profile)
        trajectory, target = make_trajectory(patient_id, p, index)
        dump(ROOT / f'{patient_id}.json', trajectory)
        trajectories.append(trajectory)
        targets.append(target)
        provenance.append({'patient_id': patient_id, 'canonical_profile': str(profile), 'canonical_profile_sha256': sha256(profile), 'persona_anchor': p['anchor']})
    gold = {'trajectories': targets}
    dump(ROOT / 'gold.json', gold)
    result = audit(trajectories, gold)
    dump(ROOT / 'audit.json', result)
    dump(ROOT / 'provenance.json', {'version': VERSION, 'generator': 'deterministic, hand-authored scenario and dialogue templates', 'random_seed': None, 'model_calls': 0, 'generation_timestamp_fixed': '2026-09-28', 'personas': provenance, 'common_uncertainty_policy': UNKNOWN_POLICY})
    terms = []
    for p in PATIENTS.values():
        terms.extend(p['facts'] + [p['accepted'], p['rejected'], p['completed'], p['planned']])
    (ROOT / 'novel_target_names.txt').write_text('\n'.join(terms) + '\n', encoding='utf-8')
    manifest_files = [ROOT / f'{p}.json' for p in PATIENTS] + [ROOT / 'gold.json', ROOT / 'provenance.json', ROOT / 'audit.json', Path(__file__), ROOT / 'novel_target_names.txt', ROOT / 'AUDIT.md', ROOT / 'SCORING.md']
    dump(ROOT / 'manifest.json', {'version': VERSION, 'files': [{'path': p.name, 'sha256': sha256(p)} for p in manifest_files]})
    for summary in result['trajectories']:
        print(f"{summary['patient_id']}: {summary['exchanges']} exchanges; {summary['final_history_utf8_bytes_div_3_ceil']} UTF-8-bytes/3 units")
    print('Validated 40 probe specifications and their source quotations; no model calls.')


if __name__ == '__main__':
    main()
