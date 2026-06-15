import numpy as np

import main


def _coords(n=21):
    # Distinct values per landmark and per axis so the mirror logic is easy to verify.
    # Non-zero wrist so wrist-relative subtraction is non-trivial.
    return [(0.1 * i + 0.5, 0.2 * i + 1.0, 0.05 * i + 2.0) for i in range(n)]


def test_returns_63_length_vector(hands_process, make_hand, make_handedness, make_result, pil_image):
    coords = _coords()
    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Right")]
    )

    out = main.extract_features(pil_image)

    assert out is not None
    assert out.shape == (1, 63)


def test_wrist_relative_origin(hands_process, make_hand, make_handedness, make_result, pil_image):
    coords = _coords()
    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Right")]
    )

    out = main.extract_features(pil_image)[0]
    # Landmark 0 is the wrist; its wrist-relative triple must be (0, 0, 0).
    np.testing.assert_allclose(out[0:3], [0.0, 0.0, 0.0], atol=1e-9)


def test_right_hand_no_mirror(hands_process, make_hand, make_handedness, make_result, pil_image):
    coords = _coords()
    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Right")]
    )

    out = main.extract_features(pil_image)[0]

    wx, wy, wz = coords[0]
    for i, (x, y, z) in enumerate(coords):
        np.testing.assert_allclose(
            out[3 * i : 3 * i + 3],
            [x - wx, y - wy, z - wz],
            atol=1e-9,
        )


def test_left_hand_mirrors_x_only(hands_process, make_hand, make_handedness, make_result, pil_image):
    """The x mirror applies to the WRIST-RELATIVE x value, not raw lm.x."""
    coords = _coords()
    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Left")]
    )

    out = main.extract_features(pil_image)[0]

    wx, wy, wz = coords[0]
    for i, (x, y, z) in enumerate(coords):
        # x is negated AFTER wrist subtraction; y and z untouched.
        np.testing.assert_allclose(
            out[3 * i : 3 * i + 3],
            [-(x - wx), y - wy, z - wz],
            atol=1e-9,
        )


def test_left_vs_right_differ_only_in_x(hands_process, make_hand, make_handedness, make_result, pil_image):
    """Cross-check: swapping handedness flips exactly the x components."""
    coords = _coords()

    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Right")]
    )
    right = main.extract_features(pil_image)[0].copy()

    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Left")]
    )
    left = main.extract_features(pil_image)[0].copy()

    # x slots (every 3rd) are negated; y/z slots equal.
    np.testing.assert_allclose(left[0::3], -right[0::3], atol=1e-9)
    np.testing.assert_allclose(left[1::3], right[1::3], atol=1e-9)
    np.testing.assert_allclose(left[2::3], right[2::3], atol=1e-9)


def test_no_hand_returns_none(hands_process, make_result, pil_image):
    hands_process.return_value = make_result(None, None)

    assert main.extract_features(pil_image) is None


def test_wrong_landmark_count_returns_none(hands_process, make_hand, make_handedness, make_result, pil_image):
    # 5 landmarks → only 15 features, so the len(features) == 63 guard fires.
    coords = _coords(n=5)
    hands_process.return_value = make_result(
        [make_hand(coords)], [make_handedness("Right")]
    )

    assert main.extract_features(pil_image) is None
