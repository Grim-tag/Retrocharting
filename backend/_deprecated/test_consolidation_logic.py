from app.services.consolidation import normalize_name, normalize_console, create_slug

def test_normalization():
    examples = [
        ("Super Mario 64", "super mario 64"),
        ("Super Mario 64 (PAL)", "super mario 64"),
        ("Air Boarder 64 JP", "air boarder 64"),
        ("Air Boarder 64 (JP)", "air boarder 64"),
        ("F-Zero X PAL Version", "fzero x"), # Might be tricky with "Version"
        ("Zelda Ocarina of Time [Import]", "zelda ocarina of time"), 
        (" Biohazard 2  ", "biohazard 2"),
        ("Donkey Kong 64   JAPAN", "donkey kong 64"),
    ]
    
    print("--- Testing Name Normalization ---")
    for raw, expected in examples:
        got = normalize_name(raw)
        # Loose match for test simplicity or specific check?
        print(f"'{raw}' -> '{got}'")
        if got != expected:
            print(f"   [WARN] Expected '{expected}', got '{got}'")

def test_console_normalization():
    examples = [
        ("Nintendo 64", "Nintendo 64"),
        ("PAL Nintendo 64", "Nintendo 64"),
        ("Nintendo 64 JP", "Nintendo 64"),
        ("JP Nintendo 64", "Nintendo 64"),
        ("NTSC Nintendo 64", "Nintendo 64"),
        ("Nintendo 64 (JP)", "Nintendo 64"),
    ]
    
    print("\n--- Testing Console Normalization ---")
    for raw, expected in examples:
        got = normalize_console(raw)
        print(f"'{raw}' -> '{got}'")
        if got != expected:
            print(f"   [FAIL] Expected '{expected}', got '{got}'")

if __name__ == "__main__":
    test_normalization()
    test_console_normalization()
