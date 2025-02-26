import unittest
from typing import List, Tuple
from unittest.mock import patch, Mock
import io
import sys
import random

from study_problem_blank import Menu, Order, Customer, Restaurant


class TestMenu(unittest.TestCase):
    """Dedicated test class for Menu functionality"""

    def setUp(self):
        self.menu = Menu()

    def test_menu_initialization(self):
        """Test if Menu is initialized with correct items and prices"""
        expected_menu = {
            "chicken": 12.00,
            "pork": 10.00,
            "vegetables": 9.00,
            "rice": 12.00,
        }
        self.assertEqual(self.menu.menu, expected_menu)

    def test_menu_item_types(self):
        """Test if menu items and prices are of correct types"""
        for item, price in self.menu.menu.items():
            self.assertIsInstance(item, str)
            self.assertIsInstance(price, float)


class TestOrder(unittest.TestCase):
    """Dedicated test class for Order functionality"""

    def setUp(self):
        self.order = Order()

    def test_order_initialization(self):
        """Test Order initialization with default values"""
        self.assertEqual(self.order.id, 0)
        self.assertEqual(self.order.items, [])
        self.assertEqual(self.order.cost, 0)

    def test_order_custom_initialization(self):
        """Test Order initialization with custom values"""
        items = ["chicken", "rice"]
        order = Order(1234, items, 24.00)
        self.assertEqual(order.id, 1234)
        self.assertEqual(order.items, items)
        self.assertEqual(order.cost, 24.00)

    def test_order_item_modification(self):
        """Test direct modification of order items"""
        self.order.items.append("chicken")
        self.assertEqual(len(self.order.items), 1)
        self.assertEqual(self.order.items[0], "chicken")


class TestCustomer(unittest.TestCase):
    """Dedicated test class for Customer functionality"""

    def setUp(self):
        self.customer = Customer("Test Customer")
        self.order = Order()

    def test_customer_initialization(self):
        """Test customer initialization with name and menu"""
        self.assertEqual(self.customer.name, "Test Customer")
        self.assertIsInstance(self.customer.menu, Menu)

    def test_view_menu_empty_menu(self):
        """Test view_menu with empty menu"""
        self.customer.menu.menu = {}
        captured_output = io.StringIO()
        sys.stdout = captured_output
        self.customer.view_menu()
        sys.stdout = sys.__stdout__
        self.assertEqual(captured_output.getvalue(), "item | cost\n")

    def test_create_multiple_orders(self):
        """Test creating multiple orders generates unique IDs"""
        orders = [self.customer.create_order() for _ in range(10)]
        order_ids = [order.id for order in orders]
        self.assertEqual(len(set(order_ids)), 10)

    def test_add_multiple_same_items(self):
        """Test adding same item multiple times"""
        order = self.customer.create_order()
        self.customer.add_to_order(order, "chicken")
        self.customer.add_to_order(order, "chicken")
        self.assertEqual(order.items.count("chicken"), 2)
        self.assertEqual(order.cost, 24.00)

    def test_remove_all_items(self):
        """Test removing all items from order"""
        order = Order(1234, ["chicken", "rice", "vegetables"], 33.00)
        for item in order.items.copy():
            self.customer.remove_from_order(order, item)
        self.assertEqual(order.items, [])
        self.assertEqual(order.cost, 0)

    def test_get_receipt_empty_order(self):
        """Test getting receipt for empty order"""
        order = self.customer.create_order()
        expected_output = f"{self.customer.name}:\n-----\n-----\n0\n"
        captured_output = io.StringIO()
        sys.stdout = captured_output
        self.customer.get_receipt(order)
        sys.stdout = sys.__stdout__
        self.assertEqual(captured_output.getvalue(), expected_output)

    def test_calculate_order_cost_empty(self):
        """Test calculating cost for empty order"""
        order = self.customer.create_order()
        self.assertEqual(self.customer.calculate_order_cost(order), 0)

    def test_calculate_order_cost_multiple_items(self):
        """Test calculating cost for multiple items"""
        order = Order()
        items = ["chicken", "rice", "vegetables"]
        for item in items:
            self.customer.add_to_order(order, item)
        expected_cost = 12.00 + 12.00 + 9.00
        self.assertEqual(order.cost, expected_cost)


class TestRestaurant(unittest.TestCase):
    """Dedicated test class for Restaurant functionality"""

    def setUp(self):
        self.restaurant = Restaurant()

    def test_restaurant_initialization(self):
        """Test restaurant initialization"""
        self.assertIsInstance(self.restaurant.inventory, dict)
        self.assertIsInstance(self.restaurant.cook_time_in_minutes, dict)
        self.assertIsInstance(self.restaurant.order_queue, list)

    def test_empty_queue_cook_order(self):
        """Test cooking order with empty queue"""
        empty = self.restaurant.cook_order()
        self.assertEqual(empty, (-1, 0))

    def test_insufficient_inventory(self):
        """Test cooking order with insufficient inventory"""
        self.restaurant.inventory["chicken"] = 0

        order = Order(1234, ["chicken"], 12.00)
        self.restaurant.add_to_queue(order)
        order_id, cook_time = self.restaurant.cook_order()

        self.assertEqual(cook_time, 0)

    def test_large_order_cooking(self):
        """Test cooking large order with multiple items"""
        order = Order(1234, ["chicken", "pork", "vegetables", "rice"], 43.00)
        self.restaurant.add_to_queue(order)
        order_id, cook_time = self.restaurant.cook_order()

        expected_time = sum(
            self.restaurant.cook_time_in_minutes[item] for item in order.items
        )
        self.assertEqual(cook_time, expected_time)

    def test_multiple_orders_queue(self):
        """Test handling multiple orders in queue"""
        orders = [
            Order(1, ["chicken"], 12.00),
            Order(2, ["pork"], 10.00),
            Order(3, ["vegetables"], 9.00),
        ]

        for order in orders:
            self.restaurant.add_to_queue(order)

        self.assertEqual(len(self.restaurant.order_queue), 3)

        cooked_orders = []
        while self.restaurant.order_queue:
            order_id, time = self.restaurant.cook_order()
            cooked_orders.append(order_id)

        self.assertEqual(cooked_orders, [3, 2, 1])

    def test_inventory_tracking(self):
        """Test accurate inventory tracking after multiple orders"""
        initial_inventory = self.restaurant.inventory.copy()

        orders = [Order(1, ["chicken"], 12.00), Order(2, ["chicken"], 12.00)]

        for order in orders:
            self.restaurant.add_to_queue(order)
            self.restaurant.cook_order()

        expected_chicken = initial_inventory["chicken"] - 2
        self.assertEqual(self.restaurant.inventory["chicken"], expected_chicken)

    def test_maximum_cooking_capacity(self):
        """Test cooking more orders than inventory allows"""
        chicken_inventory = self.restaurant.inventory["chicken"]
        orders = [Order(i, ["chicken"], 12.00) for i in range(chicken_inventory + 2)]

        for order in orders:
            self.restaurant.add_to_queue(order)

        valid_cooks = 0
        while self.restaurant.order_queue:
            _, time = self.restaurant.cook_order()
            if time > 0:
                valid_cooks += 1

        self.assertEqual(valid_cooks, chicken_inventory)


class TestIntegration(unittest.TestCase):
    """Integration tests for the entire system"""

    def setUp(self):
        self.customer = Customer("Integration Test")
        self.restaurant = Restaurant()

    def test_full_order_flow(self):
        """Test complete flow from order creation to cooking"""
        order = self.customer.create_order()
        self.customer.add_to_order(order, "chicken")
        self.customer.add_to_order(order, "rice")

        self.assertEqual(len(order.items), 2)
        self.assertEqual(order.cost, 24.00)

        self.restaurant.add_to_queue(order)
        order_id, cook_time = self.restaurant.cook_order()

        self.assertEqual(order_id, order.id)
        self.assertEqual(cook_time, 45)  # 15 for chicken + 30 for rice
        self.assertEqual(self.restaurant.inventory["chicken"], 3)
        self.assertEqual(self.restaurant.inventory["rice"], 6)

    def test_multiple_customers_same_restaurant(self):
        """Test multiple customers ordering from same restaurant"""
        customers = [Customer(f"Customer {i}") for i in range(3)]
        orders = []

        for customer in customers:
            order = customer.create_order()
            customer.add_to_order(order, "chicken")
            orders.append(order)
            self.restaurant.add_to_queue(order)

        processed_orders = []
        while self.restaurant.order_queue:
            order_id, _ = self.restaurant.cook_order()
            processed_orders.append(order_id)

        self.assertEqual(len(processed_orders), 3)
        self.assertEqual(self.restaurant.inventory["chicken"], 1)  # 4 - 3 orders


if __name__ == "__main__":
    unittest.main()
