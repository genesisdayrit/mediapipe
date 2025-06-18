#!/usr/bin/env python3
"""
Unit tests for MediaPipe Pose Verification utility functions.
"""

import unittest
import numpy as np
import sys
import os

# Add src directory to path to import utils
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from utils import calculate_angle, check_posture_correctness, load_reference_data


class TestAngleCalculation(unittest.TestCase):
    """Test cases for angle calculation functions."""
    
    def test_calculate_angle_90_degrees(self):
        """Test calculation of a 90-degree angle."""
        point_a = (0, 1)  # Above center
        point_b = (0, 0)  # Center (vertex)
        point_c = (1, 0)  # Right of center
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 90.0, places=1)
    
    def test_calculate_angle_180_degrees(self):
        """Test calculation of a 180-degree angle (straight line)."""
        point_a = (-1, 0)  # Left of center
        point_b = (0, 0)   # Center (vertex)
        point_c = (1, 0)   # Right of center
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 180.0, places=1)
    
    def test_calculate_angle_0_degrees(self):
        """Test calculation of a 0-degree angle (overlapping points)."""
        point_a = (1, 0)   # Right of center
        point_b = (0, 0)   # Center (vertex)
        point_c = (1, 0)   # Same as point_a
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 0.0, places=1)
    
    def test_calculate_angle_45_degrees(self):
        """Test calculation of a 45-degree angle."""
        point_a = (0, 1)   # Above center
        point_b = (0, 0)   # Center (vertex)
        point_c = (1, 1)   # Diagonal
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 45.0, places=1)
    
    def test_calculate_angle_with_negative_coordinates(self):
        """Test angle calculation with negative coordinates."""
        point_a = (-1, -1)
        point_b = (0, 0)
        point_c = (1, -1)
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 90.0, places=1)


class TestPostureVerification(unittest.TestCase):
    """Test cases for posture verification functions."""
    
    def setUp(self):
        """Set up test data."""
        self.reference_data = {
            "pushup": {
                "elbow_angle": [90, 120]
            },
            "handstand": {
                "shoulder_hip_ankle_angle": [170, 180],
                "elbow_angle": [160, 180]
            }
        }
    
    def test_load_reference_data(self):
        """Test loading reference data."""
        reference = load_reference_data()
        self.assertIsInstance(reference, dict)
        self.assertIn('pushup', reference)
        self.assertIn('handstand', reference)
    
    def test_check_posture_correctness_pushup_correct(self):
        """Test posture correctness check for valid push-up angles."""
        angles = {
            'elbow_angle_left': 100.0,
            'elbow_angle_right': 110.0
        }
        
        # Mock the reference data loading
        import utils
        original_load = utils.load_reference_data
        utils.load_reference_data = lambda: self.reference_data
        
        try:
            correctness = check_posture_correctness(angles, 'pushup')
            self.assertTrue(correctness.get('elbow_angle_left', False))
            self.assertTrue(correctness.get('elbow_angle_right', False))
        finally:
            utils.load_reference_data = original_load
    
    def test_check_posture_correctness_pushup_incorrect(self):
        """Test posture correctness check for invalid push-up angles."""
        angles = {
            'elbow_angle_left': 60.0,  # Too acute
            'elbow_angle_right': 140.0  # Too obtuse
        }
        
        # Mock the reference data loading
        import utils
        original_load = utils.load_reference_data
        utils.load_reference_data = lambda: self.reference_data
        
        try:
            correctness = check_posture_correctness(angles, 'pushup')
            self.assertFalse(correctness.get('elbow_angle_left', True))
            self.assertFalse(correctness.get('elbow_angle_right', True))
        finally:
            utils.load_reference_data = original_load
    
    def test_check_posture_correctness_handstand_correct(self):
        """Test posture correctness check for valid handstand angles."""
        angles = {
            'shoulder_hip_ankle_angle_left': 175.0,
            'shoulder_hip_ankle_angle_right': 178.0,
            'elbow_angle_left': 170.0,
            'elbow_angle_right': 175.0
        }
        
        # Mock the reference data loading
        import utils
        original_load = utils.load_reference_data
        utils.load_reference_data = lambda: self.reference_data
        
        try:
            correctness = check_posture_correctness(angles, 'handstand')
            self.assertTrue(correctness.get('shoulder_hip_ankle_angle_left', False))
            self.assertTrue(correctness.get('shoulder_hip_ankle_angle_right', False))
            self.assertTrue(correctness.get('elbow_angle_left', False))
            self.assertTrue(correctness.get('elbow_angle_right', False))
        finally:
            utils.load_reference_data = original_load


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and error handling."""
    
    def test_calculate_angle_with_zero_vectors(self):
        """Test angle calculation when points are the same."""
        point_a = (0, 0)
        point_b = (0, 0)
        point_c = (0, 0)
        
        # Should handle gracefully without throwing an error
        try:
            angle = calculate_angle(point_a, point_b, point_c)
            # The result might be NaN or 0, but shouldn't crash
            self.assertTrue(np.isnan(angle) or angle >= 0)
        except:
            self.fail("calculate_angle raised an exception with zero vectors")
    
    def test_calculate_angle_with_very_small_distances(self):
        """Test angle calculation with very small distances between points."""
        point_a = (0.0001, 0)
        point_b = (0, 0)
        point_c = (0, 0.0001)
        
        angle = calculate_angle(point_a, point_b, point_c)
        self.assertAlmostEqual(angle, 90.0, places=0)  # Less precision for small numbers


class TestIntegration(unittest.TestCase):
    """Integration tests for combined functionality."""
    
    def test_pushup_analysis_workflow(self):
        """Test the complete workflow for push-up analysis."""
        # Simulate angles that would be calculated for a good push-up
        test_angles = {
            'elbow_angle_left': 95.0,
            'elbow_angle_right': 100.0
        }
        
        # Test the complete workflow
        import utils
        original_load = utils.load_reference_data
        utils.load_reference_data = lambda: {
            "pushup": {"elbow_angle": [90, 120]},
            "handstand": {"shoulder_hip_ankle_angle": [170, 180]}
        }
        
        try:
            correctness = check_posture_correctness(test_angles, 'pushup')
            
            # Both angles should be within the correct range
            self.assertTrue(correctness.get('elbow_angle_left', False))
            self.assertTrue(correctness.get('elbow_angle_right', False))
        finally:
            utils.load_reference_data = original_load
    
    def test_handstand_analysis_workflow(self):
        """Test the complete workflow for handstand analysis."""
        # Simulate angles for a good handstand
        test_angles = {
            'shoulder_hip_ankle_angle_left': 175.0,
            'shoulder_hip_ankle_angle_right': 177.0,
            'elbow_angle_left': 165.0,
            'elbow_angle_right': 170.0
        }
        
        import utils
        original_load = utils.load_reference_data
        utils.load_reference_data = lambda: {
            "pushup": {"elbow_angle": [90, 120]},
            "handstand": {
                "shoulder_hip_ankle_angle": [170, 180],
                "elbow_angle": [160, 180]
            }
        }
        
        try:
            correctness = check_posture_correctness(test_angles, 'handstand')
            
            # All angles should be within the correct ranges
            self.assertTrue(correctness.get('shoulder_hip_ankle_angle_left', False))
            self.assertTrue(correctness.get('shoulder_hip_ankle_angle_right', False))
            self.assertTrue(correctness.get('elbow_angle_left', False))
            self.assertTrue(correctness.get('elbow_angle_right', False))
        finally:
            utils.load_reference_data = original_load


if __name__ == '__main__':
    # Create test suite
    test_suite = unittest.TestSuite()
    
    # Add test cases
    test_suite.addTest(unittest.makeSuite(TestAngleCalculation))
    test_suite.addTest(unittest.makeSuite(TestPostureVerification))
    test_suite.addTest(unittest.makeSuite(TestEdgeCases))
    test_suite.addTest(unittest.makeSuite(TestIntegration))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\nTests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    
    if result.failures:
        print("\nFailures:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print("\nErrors:")
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}") 