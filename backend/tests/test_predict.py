import io


def _landmarks_result(make_hand, make_handedness, make_result, label="Right"):
    coords = [(0.05 * i, 0.05 * i, 0.01 * i) for i in range(21)]
    return make_result([make_hand(coords)], [make_handedness(label)])


def test_predict_returns_letter(
    client, hands_process, model_mock, encoder_mock,
    make_hand, make_handedness, make_result, jpeg_bytes,
):
    hands_process.return_value = _landmarks_result(make_hand, make_handedness, make_result)
    model_mock.predict.return_value = [0]
    encoder_mock.inverse_transform.return_value = ["A"]

    r = client.post(
        "/predict/",
        files={"file": ("capture.jpg", jpeg_bytes(), "image/jpeg")},
    )

    assert r.status_code == 200
    assert r.json() == {"prediction": "A"}
    model_mock.predict.assert_called_once()


def test_predict_no_hand_returns_error(client, hands_process, make_result, jpeg_bytes):
    hands_process.return_value = make_result(None, None)

    r = client.post(
        "/predict/",
        files={"file": ("capture.jpg", jpeg_bytes(), "image/jpeg")},
    )

    assert r.status_code == 200
    assert r.json() == {"error": "No hand detected"}


def test_predict_bad_upload_returns_parsing_error(client):
    # NOTE: the endpoint catches every exception and responds 200 with
    # {"error": "parsing body error"}. Follow-up: this should be a 4xx.
    r = client.post(
        "/predict/",
        files={"file": ("nope.jpg", io.BytesIO(b"definitely not an image"), "image/jpeg")},
    )

    assert r.status_code == 200
    assert r.json() == {"error": "parsing body error"}
