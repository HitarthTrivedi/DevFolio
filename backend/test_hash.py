import hashlib

passwords = ["password", "password123", "hitarth", "Hitarth", "Hitarth@318", "HitarthTrivedi", "hitarthtrivedi"]

for p in passwords:
    h = hashlib.sha256(p.encode()).hexdigest()
    if h == "be165c3432b8ad4bb0cd2f5d4bf60c3992f2d4ec573a6e2238aefbf887b1842d":
        print(f"Cracked! The password is: {p}")
        break
else:
    print("Not found in the simple list.")
