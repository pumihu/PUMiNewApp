"""
Mentor tool definitions.
Currently placeholder — tools are expressed as suggested_actions in the response,
not as function-calling tools. Extend here when adding real tool-use.
"""
from typing import List


def parse_suggested_actions(text: str) -> List[dict]:
    """
    Extract suggested actions from mentor response text.
    Looks for lines like:
      - [ACTION: create_block] Create a task list block
    Returns a list of SuggestedAction-compatible dicts.
    """
    import re
    actions = []
    pattern = re.compile(r"\[ACTION:\s*(\w+)\]\s*(.+)")
    for line in text.splitlines():
        m = pattern.search(line)
        if m:
            actions.append({"action": m.group(1), "label": m.group(2).strip()})
    return actions
