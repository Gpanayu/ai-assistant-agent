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
        The output should be:
        item | cost
        chicken | 12.00 
        """
        pass

    def create_order(self) -> Order:
        """
        Return a Order with: 
          - 4 digit id
          - The items orders
          - The total cost
        """
        pass
    
    def clear_order(self, order: Order):
        """
        Clear the order items and the cost
        """
        pass

    def view_order_summary(self, order: Order):
        """
        Print the order summary with the items and the total cost"""
        pass

    def add_to_order(self, order: Order, item: str):
        """
        Add items to order and update the cost, the order must be on the menu
        If the order is on the menu print "Added [item name]: [cost]"
        Else print "Not on menu"
        """
        pass

    
    def remove_from_order(self, order: Order, item: str) -> bool:
        """
        Remove items from order and update the cost, the item must be ordered
        If the item is on the order return True print "Removed [item name]"
        Else return False and print "Not ordered" 
        """
        pass
    
    def calculate_order_cost(self, order: Order):
        """
        Calculate the cost of the order
        """
        pass
    
    def get_receipt(self, order: Order):
        """
        The output should be:
        name:
        -----
        [items ordered] .. [cost]
        ------
        total cost
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
        Add incoming order to the queue
        """
        pass

    def cook_order(self) -> Tuple[str, int]:
        """
        Pop the latest order if there is enough inventory
        When an item is cooked remove one from the inventory
        Return back a tuple with id and the time to cook
        """
        pass

    def view_inventory(self):
        """
        Print the current inventory in the following format:
        Current Inventory:
        item: quantity  
        """
        pass

    def restock_inventory(self, item: str, amount: int):
        """
        Restock the inventory with the amount of the item
        If the item is not in the inventory print "Not found in inventory"
        Else print "Restocked [item]. New quantity: [quantity]"
        """
        pass
    
    def cook_time_helper(self, item: str):
        return self.cook_time_in_minutes[item]

    def inventory_helper(self, item: str):
            if self.inventory[item] > 0:
                self.inventory[item] -= 1
                return True
            return False
    
    def average_cook_time(self):
        if not self.order_queue:
            print("No orders in queue.")
            return 0
        total_time = sum(self.cook_time_helper(item) for order in self.order_queue for item in order.items)
        avg_time = total_time / len(self.order_queue)
        print(f"Average cooking time: {avg_time:.2f} minutes.")
        return avg_time

