import random
from typing import List, Tuple

#Object Oriented Programming, Class, Dictionary
class Menu:
    def __init__(self):
        self.menu = {
            "chicken": 12.00,
            "pork": 10.00,
            "vegetables": 9.00,
            "rice": 12.00
        }

#Object Oriented Programming(Encapsulation), Class, List Operations
class Order:
    def __init__(self, uuid=0, items=None, cost=0):
      self.id = uuid
      self.items = items if items is not None else [] 
      self.cost = cost

#Object Oriented Programming(Encapsulation), Class, List Operations, Dictionary Operation
class Customer: 
    def __init__(self, name):
        self.name = name 
        self.menu = Menu()
    
    # String Concatenation:, String Interpolation, Looping
    def view_menu(self):
        """
        The output should be:
        item | cost
        chicken | 12.00 
        """
        print("item | cost")
        for k, v in self.menu.menu.items():
            print(f"{k} | {v}")
    
    # Random Number Generation, Object Instantiation(Object Oriented Programming)
    def create_order(self) -> Order:
        """
        Return a Order with: 
          - 4 digit id
          - The items orders
          - The total cost
        """
        uuid = random.randint(1000, 9999)
        return Order(uuid)
    
    def clear_order(self, order: Order):
        """
        Clear the order items and the cost
        """
        order.items.clear()
        order.cost = 0
        print("Order cleared.")

    def view_order_summary(self, order: Order):
        """
        Print the order summary with the items and the total cost"""
        print("Order Summary:")
        for item in order.items:
            print(f"{item} - ${self.menu.menu[item]}")
        print(f"Total: ${order.cost}")

    #Conditional Statements(If-Else), String Interpolation, List 
    def add_to_order(self, order: Order, item: str):
        """
        Add items to order and update the cost, the order must be on the menu
        If the order is on the menu print "Added [item name]: [cost]"
        Else print "Not on menu"
        """
        if item in self.menu.menu:
            order.items.append(item)
            order.cost = self.calculate_order_cost(order)
            print(f"Added {item}: {self.menu.menu[item]}")
            return item

        print("Not on menu")
    
    #Conditional Statements(If-Else), String Interpolation, List, Function calling
    def remove_from_order(self, order: Order, item: str) -> bool:
        """
        Remove items from order and update the cost, the item must be ordered
        If the item is on the order return True print "Removed [item name]"
        Else return False and print "Not ordered" 
        """
        if item in order.items:
            order.items.remove(item)
            order.cost = self.calculate_order_cost(order)
            print(f"Removed {item}")
            return True

        print("Not ordered")
        return False 
    
    #Loops, Dictionary Access, 
    def calculate_order_cost(self, order: Order):
        """
        Calculate the cost of the order
        """
        cost = 0
        for i in order.items:
            cost += self.menu.menu[i]
        return cost
    
    #String Interpolation, Looping(), string formating
    def get_receipt(self, order: Order):
        """
        The output should be:
        name:
        -----
        [items ordered] .. [cost]
        ------
        total cost
        """
        print(f"{self.name}:")
        print("-----")
        for item in order.items:
            print(f"{item} .. {self.menu.menu[item]}")
        print("-----")
        print(f"{order.cost}")

#Object Oriented Programming(Encapsulation), Class, List Operations, Dictionary Operation
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

    #List Operations,
    def add_to_queue(self, order: Order):
        """
        Add incoming order to the queue
        """
        self.order_queue.append(order)

    #List Operations, Tuple, Looping, Function calling
    def cook_order(self) -> Tuple[str, int]:
        """
        Pop the latest order if there is enough inventory
        When an item is cooked remove one from the inventory
        Return back a tuple with id and the time to cook
        """
        order = self.order_queue.pop()
        time = 0
        for item in order.items:
            if (self.inventory_helper(item)):
                time += self.cook_time_helper(item) 
        return (order.id, time)
    
    def view_inventory(self):
        """
        Print the current inventory in the following format:
        Current Inventory:
        item: quantity  
        """
        print("Current Inventory:")
        for item, quantity in self.inventory.items():
            print(f"{item}: {quantity}")
    
    def restock_inventory(self, item: str, amount: int):
        """
        Restock the inventory with the amount of the item
        If the item is not in the inventory print "Not found in inventory"
        Else print "Restocked [item]. New quantity: [quantity]"
        """
        if item in self.inventory:
            self.inventory[item] += amount
            print(f"Restocked {item}. New quantity: {self.inventory[item]}")
        else:
            print(f"{item} not found in inventory.")

    #Dictionary Operations,
    def cook_time_helper(self, item: str):
        return self.cook_time_in_minutes[item]

    #Conditional Statements(If-Else), Dictionary Operations
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

restaurant = Restaurant()
customer = Customer("Alice")

def run():
    customer.view_menu()
    order = customer.create_order()
    customer.add_to_order(order, "chicken")
    customer.add_to_order(order, "beef")
    customer.add_to_order(order, "vegetables")

    customer.remove_from_order(order, "vegetables")
    customer.remove_from_order(order, "beef")

    customer.get_receipt(order)

    restaurant.add_to_queue(order)
    (id, time) = restaurant.cook_order()
    print(id, time)

run()