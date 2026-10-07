# Analysis guard correction

The frozen scorer is preserved. `analysis/summarize_v2.py` adds a cardinality check so that every completed unique generation has exactly one blinded card. The prior set-equality check rejected missing jobs but admitted duplicate mappings. The independent synthetic audit reproduced silent overwrite with 31 cards for 30 jobs. Generation inputs, rubric, endpoints and formulas are unchanged. This amendment is made before viewing any structured semantic ratings.
