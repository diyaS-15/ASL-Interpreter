def test_leaderboard_empty(client):
    r = client.get("/leaderboard/")
    assert r.status_code == 200
    assert r.json() == []


def test_leaderboard_ordered_by_points_desc(client):
    for name in ("low", "high", "mid"):
        client.post("/players/", json={"username": name})

    # high → 20, mid → 10, low → 5 via the real endpoints
    for _ in range(4):
        client.post("/players/high/add-points/")
    for _ in range(2):
        client.post("/players/mid/add-points/")
    client.post("/players/low/add-points/")

    lb = client.get("/leaderboard/").json()
    assert [(p["username"], p["points"]) for p in lb] == [
        ("high", 20),
        ("mid", 10),
        ("low", 5),
    ]


def test_delete_leaderboard_clears_table(client):
    client.post("/players/", json={"username": "x"})
    client.post("/players/", json={"username": "y"})

    r = client.delete("/leaderboard/")
    assert r.status_code == 200
    assert "2 players deleted" in r.json()["message"]
    assert client.get("/leaderboard/").json() == []
