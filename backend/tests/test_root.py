def test_root_returns_welcome(client):
    r = client.get("/")
    assert r.status_code == 200
    assert r.json() == {"message": "welcome to asl hangman"}
