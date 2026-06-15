def test_create_player_returns_zero_points(client):
    r = client.post("/players/", json={"username": "alice"})
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "alice"
    assert body["points"] == 0
    assert isinstance(body["id"], int)


def test_create_player_idempotent(client):
    r1 = client.post("/players/", json={"username": "bob"})
    r2 = client.post("/players/", json={"username": "bob"})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
    # Only one row in the leaderboard.
    lb = client.get("/leaderboard/").json()
    assert sum(1 for p in lb if p["username"] == "bob") == 1


def test_add_points_increments_by_5(client):
    client.post("/players/", json={"username": "carol"})

    r1 = client.post("/players/carol/add-points/")
    assert r1.status_code == 200
    assert r1.json()["total points"] == 5

    r2 = client.post("/players/carol/add-points/")
    assert r2.json()["total points"] == 10


def test_add_points_404_when_missing(client):
    r = client.post("/players/nobody/add-points/")
    assert r.status_code == 404


def test_add_learn_points_increments_by_2(client):
    client.post("/players/", json={"username": "dave"})

    r1 = client.post("/players/dave/add-learn-points/")
    assert r1.status_code == 200
    assert r1.json()["total points"] == 2

    r2 = client.post("/players/dave/add-learn-points/")
    assert r2.json()["total points"] == 4


def test_add_learn_points_404_when_missing(client):
    r = client.post("/players/nobody/add-learn-points/")
    assert r.status_code == 404
