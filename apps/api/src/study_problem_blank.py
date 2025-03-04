import random
from typing import List, Tuple

class Menu:
    def __init__(self):
        self.menu = {
            "chicken": 12.00,
            "pork": 10.00,
            "vegetables": 9.00,
            "rice": 12.00
        }

class Order:
    def __init__(self, uuid=0, items=None, cost=0):
      self.id = uuid
      self.items = items if items is not None else [] 
      self.cost = cost

class Customer: 
    def __init__(self, name):
        self.name = name 
        self.menu = Menu()
    
    def view_menu(self):
        """
        Display the menu items with their cost in the following format:

        item | cost
        chicken | 12.00

        The first line is a header followed by each item and its corresponding cost on a new line.
        """
        pass

    def create_order(self) -> Order:
        """
        Create a new order for the customer.

        The order will have a 4-digit unique id, an empty list of items, and a cost of 0.

        Returns:
            Order: A new Order instance.
        """
        pass
    
    def clear_order(self, order: Order):
        """
        Clear the order by removing all items and resetting the cost to zero.

        After clearing, prints:
            Order cleared.
        
        Args:
            order (Order): The order to be cleared.
        """
        pass

    def view_order_summary(self, order: Order):
        """
        Print a summary of the order including each item with its cost and the total cost.

        Expected output format:
            Order Summary:
            chicken - $12.0
            pork - $10.0
            Total: $22.0

        Args:
            order (Order): The order to summarize.
        """
        pass

    def add_to_order(self, order: Order, item: str):
        """
        Add an item to the order if it exists on the menu and update the total cost.

        Args:
            order (Order): The order to update.
            item (str): The item to add.

        Returns:
            str: The name of the item if added successfully.

        Prints:
            "Added [item]: [cost]" if the item is on the menu.
            "Not on menu" if the item is not available.
        """
        pass

    
    def remove_from_order(self, order: Order, item: str) -> bool:
        """
        Remove an item from the order if it exists and update the total cost.

        Args:
            order (Order): The order from which the item should be removed.
            item (str): The item to remove.

        Returns:
            bool: True if the item was removed; False if the item was not found in the order.

        Prints:
            "Removed [item]" if the removal is successful.
            "Not ordered" if the item is not in the order.
        """
        pass
    
    def calculate_order_cost(self, order: Order):
        """
        Calculate the total cost of the order based on the items ordered.

        Args:
            order (Order): The order for which the cost is calculated.

        Returns:
            float: The total cost computed from the menu prices.
        """
        pass
    
    def get_receipt(self, order: Order):
        """
        Print the receipt in the following format:

            [Customer name]:
            -----
            [item ordered] .. [cost]
            [item ordered] .. [cost]
            -----
            [total cost]

        The output must exactly follow this format.
        
        Args:
            order (Order): The order for which to generate the receipt.
        """
        pass

class Restaurant:
    def __init__(self):
        self.inventory = {
            "chicken": 4,
            "pork": 3,
            "vegetables": 12,
            "rice": 7
        }
        self.cook_time_in_minutes = {
            "chicken": 15,
            "pork": 12,
            "vegetables": 10,
            "rice": 30
        }
        self.order_queue: List[Order] = []

    def add_to_queue(self, order: Order):
        """
        Add an incoming order to the restaurant's order queue.

        Args:
            order (Order): The order to be added.
        """
        pass

    def cook_order(self) -> Tuple[str, int]:
        """
        Process the latest order in the queue if there is sufficient inventory.

        For each item in the order, if available in inventory, the inventory is decremented
        and the item's cooking time is added to the total time.

        Returns:
            tuple: A tuple containing the order id and the total cooking time in minutes.
        """
        pass

    def view_inventory(self):
        """
        Display the current inventory in the following format:

            Current Inventory:
            item: quantity
        """
        pass

    def restock_inventory(self, item: str, amount: int):
        """
        Restock the inventory with a given amount for a specified item.

        Args:
            item (str): The item to restock.
            amount (int): The number of units to add.

        Prints:
            "Restocked [item]. New quantity: [quantity]" if the item exists.
            "[item] not found in inventory." if the item is not in the inventory.
        """
        pass
    
    def cook_time_helper(self, item: str):
        """
        Retrieve the cooking time for a specific item.

        Args:
            item (str): The name of the item.

        Returns:
            int: The cooking time in minutes for the item.
        """
        return self.cook_time_in_minutes[item]

    def inventory_helper(self, item: str):
        """
        Check if the item is available in inventory and decrement its quantity by one if available.

        Args:
            item (str): The item to check.

        Returns:
            bool: True if the item was available and decremented; False otherwise.
        """
        if self.inventory[item] > 0:
            self.inventory[item] -= 1
            return True
        return False
    
    def average_cook_time(self):
        """
        Calculate and print the average cooking time for all orders in the queue.

        Returns:
            float: The average cooking time in minutes. Returns 0 if there are no orders.

        Prints:
            "Average cooking time: [average] minutes." if orders exist, or
            "No orders in queue." if the queue is empty.
        """
        if not self.order_queue:
            print("No orders in queue.")
            return 0
        total_time = sum(self.cook_time_helper(item) for order in self.order_queue for item in order.items)
        avg_time = total_time / len(self.order_queue)
        print(f"Average cooking time: {avg_time:.2f} minutes.")
        return avg_time

