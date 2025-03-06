import unittest
from typing import List, Tuple
from unittest.mock import patch, Mock
import io
import sys
import random

import study_problem_tester as main
from study_problem_classes import Menu, Order, Customer, Restaurant


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

    def test_view_menu_with_items(self):
        """Test view_menu with a non-empty menu"""
        self.customer.menu.menu = {"chicken": 12.00, "rice": 5.00, "vegetables": 9.00}
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.view_menu(self.customer)
        sys.stdout = sys.__stdout__
        # Expected: header plus each item on a new line.
        expected_output = "item | cost\nchicken | 12.0\nrice | 5.0\nvegetables | 9.0\n"
        self.assertEqual(captured_output.getvalue(), expected_output)

    def test_view_menu_empty_menu(self):
        """Test view_menu with empty menu"""
        self.customer.menu.menu = {}
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.view_menu(self.customer)
        sys.stdout = sys.__stdout__
        self.assertEqual(captured_output.getvalue(), "item | cost\n")

    def test_create_order_multiple_orders(self):
        """Test creating multiple orders generates unique IDs"""
        orders = [main.create_order(self.customer) for _ in range(10)]
        order_ids = [order.id for order in orders]
        self.assertEqual(len(set(order_ids)), 10)
    
    def test_create_order_4_digit(self):
        """Test that the Order ID is a four-digit number"""
        for _ in range(100): 
            order = main.create_order(customer=self.customer)
            self.assertTrue(1000 <= order.id <= 9999, "Order ID should be a four-digit number")


    def test_add_to_order_multiple_same_items(self):
        """Test adding same item multiple times"""
        order = main.create_order(self.customer)
        main.add_to_order(self.customer,order, "chicken")
        main.add_to_order(self.customer,order, "chicken")
        self.assertEqual(order.items.count("chicken"), 2)
        self.assertEqual(order.cost, 24.00)

    def test_remove_from_order_all_items(self):
        """Test removing all items from order"""
        order = Order(1234, ["chicken", "rice", "vegetables"], 33.00)
        for item in order.items.copy():
            main.remove_from_order(self.customer,order, item)
        self.assertEqual(order.items, [])
        self.assertEqual(order.cost, 0)

    def test_get_receipt_empty_order(self):
        """Test getting receipt for empty order"""
        order = main.create_order(self.customer)
        expected_output = f"{self.customer.name}:\n-----\n-----\n0\n"
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.get_receipt(self.customer,order)
        sys.stdout = sys.__stdout__
        self.assertEqual(captured_output.getvalue(), expected_output)

    def test_calculate_order_cost_empty(self):
        """Test calculating cost for empty order"""
        order = main.create_order(self.customer)
        self.assertEqual(main.calculate_order_cost(self.customer,order), 0)

    def test_calculate_order_cost_multiple_items(self):
        """Test calculating cost for multiple items"""
        order = Order()
        items = ["chicken", "rice", "vegetables"]
        for item in items:
            main.add_to_order(self.customer,order, item)
        expected_cost = 12.00 + 12.00 + 9.00
        self.assertEqual(order.cost, expected_cost)

    def test_clear_order(self):
        """Test clear_order to ensure order is properly cleared"""
        order = main.create_order(self.customer)
        self.customer.menu.menu = {"chicken": 12.00, "rice": 5.00}
        order.items = ["chicken", "rice"]
        order.cost = 17.00
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.clear_order(self.customer,order)
        sys.stdout = sys.__stdout__
        self.assertEqual(order.items, [])
        self.assertEqual(order.cost, 0)
        self.assertEqual(captured_output.getvalue(), "Order cleared.\n")

    def test_remove_from_order_not_present(self):
        """Test remove_from_order when the item is not in the order"""
        order = main.create_order(self.customer)
        self.customer.menu.menu = {"chicken": 12.00, "rice": 5.00}
        order.items = ["chicken"]
        captured_output = io.StringIO()
        sys.stdout = captured_output
        result = main.remove_from_order(self.customer,order, "rice")
        sys.stdout = sys.__stdout__
        self.assertFalse(result)
        self.assertEqual(order.items, ["chicken"])
        self.assertEqual(captured_output.getvalue(), "Not ordered\n")

    def test_add_to_order_item_not_in_menu(self):
        """Test add_to_order when the item is not on the menu"""
        order = main.create_order(self.customer)
        self.customer.menu.menu = {"chicken": 12.00}
        captured_output = io.StringIO()
        sys.stdout = captured_output
        result = main.add_to_order(self.customer,order, "rice")
        sys.stdout = sys.__stdout__
        self.assertIsNone(result)
        self.assertEqual(order.items, [])
        self.assertEqual(captured_output.getvalue(), "Not on menu\n")

    def test_get_receipt_non_empty(self):
        """Test get_receipt for an order with items"""
        order = main.create_order(self.customer)
        self.customer.menu.menu = {"chicken": 12.00, "rice": 5.00}
        order.items = ["chicken", "rice"]
        order.cost = main.calculate_order_cost(self.customer,order)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.get_receipt(self.customer,order)
        sys.stdout = sys.__stdout__
        expected_output = (
            "Test Customer:\n-----\nchicken .. 12.0\nrice .. 5.0\n-----\n17.0\n"
        )
        self.assertEqual(captured_output.getvalue(), expected_output)

    def test_view_order_summary(self):
        """Test view_order_summary for an order with items"""
        order = main.create_order(self.customer)
        # Set up menu prices
        self.customer.menu.menu = {"chicken": 12.00, "rice": 5.00, "vegetables": 9.00}
        order.items = ["chicken", "rice"]
        order.cost = main.calculate_order_cost(self.customer,order)
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.view_order_summary(self.customer,order)
        sys.stdout = sys.__stdout__
        # Expected summary: header, one line per item with cost, then total.
        expected_output = "Order Summary:\nchicken - $12.0\nrice - $5.0\nTotal: $17.0\n"
        self.assertEqual(captured_output.getvalue(), expected_output)


class TestRestaurant(unittest.TestCase):
    """Dedicated test class for Restaurant functionality"""

    def setUp(self):
        self.restaurant = Restaurant()

    def test_restaurant_initialization(self):
        """Test restaurant initialization"""
        self.assertIsInstance(self.restaurant.inventory, dict)
        self.assertIsInstance(self.restaurant.cook_time_in_minutes, dict)
        self.assertIsInstance(self.restaurant.order_queue, list)

    def test_cook_order_empty_queue(self):
        """Test cooking order with empty queue"""
        with self.assertRaises(IndexError):
            main.cook_order(self.restaurant)

    def test_inventory_insufficient(self):
        """Test cooking order with insufficient inventory"""
        self.restaurant.inventory["chicken"] = 0

        order = Order(1234, ["chicken"], 12.00)
        main.add_to_queue(self.restaurant,order)
        order_id, cook_time = main.cook_order(self.restaurant)

        self.assertEqual(cook_time, 0)

    def test_cook_order_large_order(self):
        """Test cooking large order with multiple items"""
        order = Order(1234, ["chicken", "pork", "vegetables", "rice"], 43.00)
        main.add_to_queue(self.restaurant,order)
        order_id, cook_time = main.cook_order(self.restaurant)

        expected_time = sum(
            self.restaurant.cook_time_in_minutes[item] for item in order.items
        )
        self.assertEqual(cook_time, expected_time)

    def test_add_to_queue_multiple_orders(self):
        """Test handling multiple orders in queue"""
        orders = [
            Order(1, ["chicken"], 12.00),
            Order(2, ["pork"], 10.00),
            Order(3, ["vegetables"], 9.00),
        ]

        for order in orders:
            main.add_to_queue(self.restaurant,order)

        self.assertEqual(len(self.restaurant.order_queue), 3)

        cooked_orders = []
        while self.restaurant.order_queue:
            order_id, time = main.cook_order(self.restaurant)
            cooked_orders.append(order_id)

        self.assertEqual(cooked_orders, [3, 2, 1])

    def test_inventory_tracking(self):
        """Test accurate inventory tracking after multiple orders"""
        initial_inventory = self.restaurant.inventory.copy()

        orders = [Order(1, ["chicken"], 12.00), Order(2, ["chicken"], 12.00)]

        for order in orders:
            main.add_to_queue(self.restaurant,order)
            main.cook_order(self.restaurant)

        expected_chicken = initial_inventory["chicken"] - 2
        self.assertEqual(self.restaurant.inventory["chicken"], expected_chicken)

    def test_view_inventory(self):
        """Test that view_inventory prints the current inventory correctly."""
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.view_inventory(self.restaurant)
        sys.stdout = sys.__stdout__
        expected_output = "Current Inventory:\n"
        # Assuming insertion order is preserved
        for item, quantity in self.restaurant.inventory.items():
            expected_output += f"{item}: {quantity}\n"
        self.assertEqual(captured_output.getvalue(), expected_output)

    def test_restock_inventory_existing_item(self):
        """Test that restock_inventory updates an existing item's quantity and prints confirmation."""
        captured_output = io.StringIO()
        sys.stdout = captured_output
        original_quantity = self.restaurant.inventory["chicken"]
        main.restock_inventory(self.restaurant,"chicken", 5)
        sys.stdout = sys.__stdout__
        expected_message = f"Restocked chicken. New quantity: {original_quantity + 5}\n"
        self.assertEqual(captured_output.getvalue(), expected_message)
        self.assertEqual(self.restaurant.inventory["chicken"], original_quantity + 5)

    def test_restock_inventory_nonexistent_item(self):
        """Test that restock_inventory prints an error message for an item not in the inventory."""
        captured_output = io.StringIO()
        sys.stdout = captured_output
        main.restock_inventory(self.restaurant,"beef", 5)
        sys.stdout = sys.__stdout__
        self.assertEqual(captured_output.getvalue(), "beef not found in inventory.\n")

    def test_maximum_cooking_capacity(self):
        """Test cooking more orders than inventory allows"""
        chicken_inventory = self.restaurant.inventory["chicken"]
        orders = [Order(i, ["chicken"], 12.00) for i in range(chicken_inventory + 2)]

        for order in orders:
            main.add_to_queue(self.restaurant,order)

        valid_cooks = 0
        while self.restaurant.order_queue:
            _, time = main.cook_order(self.restaurant)
            if time > 0:
                valid_cooks += 1

        self.assertEqual(valid_cooks, chicken_inventory)

    def test_cook_time_helper(self):
        """Test that cook_time_helper returns the correct cooking time for each item."""
        self.assertEqual(main.cook_time_helper(self.restaurant,"chicken"), 15)
        self.assertEqual(main.cook_time_helper(self.restaurant,"pork"), 12)
        self.assertEqual(main.cook_time_helper(self.restaurant,"vegetables"), 10)
        self.assertEqual(main.cook_time_helper(self.restaurant,"rice"), 30)

    def test_inventory_helper_success(self):
        """Test that inventory_helper decrements the inventory and returns True when sufficient stock exists."""
        original_quantity = self.restaurant.inventory["pork"]
        result = main.inventory_helper(self.restaurant,"pork")
        self.assertTrue(result)
        self.assertEqual(self.restaurant.inventory["pork"], original_quantity - 1)

    def test_inventory_helper_failure(self):
        """Test that inventory_helper returns False and does not decrement inventory when stock is insufficient."""
        self.restaurant.inventory["pork"] = 0
        result = main.inventory_helper(self.restaurant,"pork")
        self.assertFalse(result)
        self.assertEqual(self.restaurant.inventory["pork"], 0)

    def test_average_cook_time_empty_queue(self):
        """Test that average_cook_time returns 0 and prints a message when the order queue is empty."""
        captured_output = io.StringIO()
        sys.stdout = captured_output
        avg_time = main.average_cook_time(self.restaurant)
        sys.stdout = sys.__stdout__
        self.assertEqual(avg_time, 0)
        self.assertIn("No orders in queue.", captured_output.getvalue())

    def test_average_cook_time_nonempty_queue(self):
        """Test that average_cook_time calculates the correct average cooking time for orders in the queue."""
        # Create two orders with one item each
        order1 = Order(1, ["chicken"], 12.00)
        order2 = Order(2, ["rice"], 30.00)
        main.add_to_queue(self.restaurant,order1)
        main.add_to_queue(self.restaurant,order2)
        total_time = (
            self.restaurant.cook_time_in_minutes["chicken"]
            + self.restaurant.cook_time_in_minutes["rice"]
        )
        expected_avg = total_time / 2
        captured_output = io.StringIO()
        sys.stdout = captured_output
        avg_time = main.average_cook_time(self.restaurant)
        sys.stdout = sys.__stdout__
        self.assertAlmostEqual(avg_time, expected_avg)
        self.assertIn(
            f"Average cooking time: {expected_avg:.2f} minutes.",
            captured_output.getvalue(),
        )


class TestIntegration(unittest.TestCase):
    """Integration tests for the entire system"""

    def setUp(self):
        self.customer = Customer("Integration Test")
        self.restaurant = Restaurant()

    def test_full_order_flow(self):
        """Test complete flow from order creation to cooking"""
        order = main.create_order(self.customer)
        main.add_to_order(self.customer,order, "chicken")
        main.add_to_order(self.customer,order, "rice")

        self.assertEqual(len(order.items), 2)
        self.assertEqual(order.cost, 24.00)

        main.add_to_queue(self.restaurant,order)
        order_id, cook_time = main.cook_order(self.restaurant)

        self.assertEqual(order_id, order.id)
        self.assertEqual(cook_time, 45)  # 15 for chicken + 30 for rice
        self.assertEqual(self.restaurant.inventory["chicken"], 3)
        self.assertEqual(self.restaurant.inventory["rice"], 6)

    def test_multiple_customers_same_restaurant(self):
        """Test multiple customers ordering from same restaurant"""
        customers = [Customer(f"Customer {i}") for i in range(3)]
        orders = []

        for customer in customers:
            order = main.create_order(customer)
            main.add_to_order(customer,order, "chicken")
            orders.append(order)
            main.add_to_queue(self.restaurant,order)

        processed_orders = []
        while self.restaurant.order_queue:
            order_id, _ = main.cook_order(self.restaurant)
            processed_orders.append(order_id)

        self.assertEqual(len(processed_orders), 3)
        self.assertEqual(self.restaurant.inventory["chicken"], 1)  # 4 - 3 orders


if __name__ == "__main__":
    unittest.main()
