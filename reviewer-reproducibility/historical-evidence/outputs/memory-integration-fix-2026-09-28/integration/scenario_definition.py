"""Prespecified therapist turns and separately exported scoring rubric.

Only scenario.json is loaded by the integration worker. Patient responses are
never specified here. These facts belong to a fictional communication exercise,
and do not modify Alex's canonical clinical profile.
"""

PATIENT_ID = "alex_carter_001"
SCENARIO_ID = "alex_tern_window_integration_v1"


def build_scenario():
    scripts = [
        [
            "For our communication practice, I have named the reflection notebook Tern Window. That is my label for the notebook in this exercise. How does keeping a small notebook sound to you?",
            "We can keep the exercise modest: a few sentences about an ordinary conversation, without treating normal feelings as symptoms. What would make that useful for you?",
            "When somebody is speaking, how do you notice the urge to prepare your own reply before they finish?",
            "Let us imagine a friendly conversation that has become a little rushed. What could you say to slow it down respectfully?",
            "What felt comfortable in today's practice, and what would you like to approach more gently next time?",
        ],
        [
            "I have recorded our agreed weekly communication-practice appointment as Wednesday at 17:45, with practice partner Rina Holt. This is the arrangement for our fictional exercise. What would help you arrive feeling prepared?",
            "Rina is a practice partner, and this activity is about taking turns and listening. How would you let a partner know that you need a moment to think?",
            "There is no need to produce a perfect reply. Could you try a simple response that checks whether you have understood the other person?",
            "If a partner interprets a brief pause as disinterest, how could you explain the pause without blaming them?",
            "How would you describe the balance between being clear and leaving enough room for the other person?",
        ],
        [
            "I have booked the practice exercise in Larch Reading Room. That is the venue on my booking record. What surroundings help you concentrate on a conversation?",
            "A quiet setting can help, although ordinary distractions still happen. What small distraction would be easiest for you to acknowledge openly?",
            "Suppose someone disagrees with a minor preference of yours. How could you show that you heard them without pretending that your own preference changed?",
            "Could you try saying that in your own words, as you would in an ordinary friendly conversation?",
            "What did you notice about your tone when you made space for a different point of view?",
        ],
        [
            "Today the exercise is to distinguish what has already happened from what we might do later. What makes that distinction useful in a conversation?",
            "I have recorded that you and Rina Holt completed the Folded Map listening card during this practice session. The card activity is finished. How would you describe the experience in one or two sentences?",
            "When someone summarizes your words accurately, what do you notice about your willingness to continue?",
            "Could you offer a short acknowledgement that sounds natural to you, without trying to analyze the other person?",
            "What would you like to keep from this experience when you next talk with a friend or colleague?",
        ],
        [
            "Today let us focus on ordinary boundaries around time. How might you say that you have only a few minutes available while still showing interest?",
            "A clear boundary can include warmth. Could you give an example of a brief response that contains both?",
            "What would make it easier to ask somebody to return to a topic later, instead of agreeing when you are distracted?",
            "Imagine that the other person is mildly disappointed. How could you acknowledge that without promising more time than you have?",
            "Which part of today's practice felt closest to the way you already communicate?",
        ],
        [
            "I need to correct the appointment record. We have agreed to move the weekly practice with Rina Holt from Wednesday at 17:45 to Friday at 18:20. Friday at 18:20 replaces the old appointment. How does making a clear correction feel to you?",
            "I also mentioned Saturday at 09:30 as a possible alternative, but we did not agree to it. It remains only a proposal, and does not replace our confirmed appointment. How would you check that a suggestion has actually become an agreement?",
            "Sometimes people hear a possible option as a promise. What wording could help prevent that misunderstanding?",
            "Could you practice acknowledging a scheduling change while keeping your response simple and direct?",
            "What did you learn today about distinguishing a correction, a suggestion, and a confirmed arrangement?",
        ],
        [
            "There is also a correction to my venue record: the practice has moved from Larch Reading Room to Plover Annex. Plover Annex is now the booked venue; Larch Reading Room is the former venue. How would you let a partner know about a venue change?",
            "Suppose a partner remembers the previous arrangement. How could you correct the detail without making them feel foolish?",
            "If you are unsure whether somebody heard the correction, what respectful check could you make?",
            "Please try that as a short, ordinary spoken reply, using the tone that feels natural to you.",
            "What helped you remain clear while also being considerate today?",
        ],
        [
            "I have proposed a separate telephone rehearsal called Silver Button. It is planned as a possible next activity, and it has not been completed. How do you feel about trying a telephone exercise sometime later?",
            "We are discussing the possible exercise today, rather than performing it. What difference do you notice between planning practice and actually doing it?",
            "How might you ask for time to consider an optional activity without feeling pressured to give an immediate answer?",
            "What would help you say that you are interested in an idea while keeping your commitment honest?",
            "What would you like a practice partner to understand about the pace that works for you?",
        ],
        [
            "Today let us talk about giving ordinary feedback. What helps feedback sound specific and kind to you?",
            "Imagine that a friend interrupted you once without noticing. How would you mention it without turning it into a judgment about their character?",
            "Could you include the effect on you, and one small request for the rest of the conversation?",
            "How could you respond if the friend explains that they were excited rather than intentionally dismissive?",
            "What would a useful repair look like in that situation?",
        ],
        [
            "Before we close this series of communication exercises, could you tell me your name and age, in your own words?",
            "How has it felt to correct small misunderstandings directly during our practice?",
            "What helps you tell the difference between what you remember clearly and a detail that you are merely guessing?",
            "When a detail is uncertain, how could you acknowledge that while still taking part in the conversation?",
            "Before we review a few practical details next time, what would you like to say about the experience of these exercises?",
        ],
        [
            "What was the exact title I gave the reflection notebook at the beginning of our practice? Please recall the title from our conversations.",
            "According to the arrangement I recorded, who is the practice partner, and what is the current agreed day and time? Please distinguish it from the earlier appointment and the alternative that was only proposed.",
            "What is the current booked venue for the practice, and which venue did it replace? Please recall the names from our conversations.",
            "Which named activity did I record as completed, and which named telephone activity remained planned rather than completed?",
            "What is the surname of the person who reserved our training room? If we never established it in our conversations, please say that rather than guessing.",
        ],
    ]
    scenario = {
        "schema_version": 1, "scenario_id": SCENARIO_ID, "patient_id": PATIENT_ID,
        "language": "English", "response_source": "live model only",
        "step_id_semantics": "session index recorded as API metadata; no clinical-phase claim",
        "sessions": [
            {"session_index": index, "turns": [
                {"turn_id": f"s{index:02d}t{turn:02d}", "text": text}
                for turn, text in enumerate(script, 1)]}
            for index, script in enumerate(scripts, 1)
        ],
    }
    gold = {
        "schema_version": 1, "scenario_id": SCENARIO_ID, "patient_id": PATIENT_ID,
        "authority": "Explicit therapist records in this fictional exercise. Patient replies are outcomes, not gold replacements.",
        "scoring": "Semantic pass only when all requested relationships and values are correct; partial, mixed, uncertain, and abstained replies remain separate. Never regenerate for accuracy.",
        "probes": [
            {"turn_id": "s10t01", "category": "persistent_identity",
             "expected": {"name": "Alex Carter", "age": 30}, "source_turns": [],
             "profile_source": "data/patients/alex_carter_001.yaml: profile.name and profile.age"},
            {"turn_id": "s11t01", "category": "distant_stable_fact",
             "expected": {"notebook_title": "Tern Window"}, "source_turns": ["s01t01"]},
            {"turn_id": "s11t02", "category": "correction_and_proposal",
             "expected": {"partner": "Rina Holt", "current": "Friday at 18:20",
                          "former": "Wednesday at 17:45", "proposal_only": "Saturday at 09:30"},
             "source_turns": ["s02t01", "s06t01", "s06t02"]},
            {"turn_id": "s11t03", "category": "explicit_replacement",
             "expected": {"current_venue": "Plover Annex", "former_venue": "Larch Reading Room"},
             "source_turns": ["s03t01", "s07t01"]},
            {"turn_id": "s11t04", "category": "completed_versus_planned",
             "expected": {"completed": "Folded Map", "planned_not_completed": "Silver Button"},
             "source_turns": ["s04t02", "s08t01", "s08t02"]},
            {"turn_id": "s11t05", "category": "absent_fact_abstention", "expected": None,
             "source_turns": [], "criterion": "Explicitly states the surname was not established, with no invented surname or identification as the practice partner."},
        ],
        "novel_named_targets": ["Tern Window", "Rina Holt", "Larch Reading Room", "Plover Annex", "Folded Map", "Silver Button"],
    }
    return scenario, gold
