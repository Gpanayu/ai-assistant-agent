import random
from typing import List, Tuple

# Object Oriented Programming, Class, Dictionary
class Menu:
    def __init__(self):
        self.menu = {"chicken": 12.00, "pork": 10.00, "vegetables": 9.00, "rice": 12.00}


# Object Oriented Programming(Encapsulation), Class, List Operations
class Order:
    def __init__(self, uuid=0, items=None, cost=0):
        self.id = uuid
        self.items = items if items is not None else []
        self.cost = cost


# Object Oriented Programming(Encapsulation), Class, List Operations, Dictionary Operation
class Customer:
    def __init__(self, name):
        self.name = name
        self.menu = Menu()

    # String Concatenation:, String Interpolation, Looping
    def view_menu(self):
        """
        Display the menu items with their cost in the following format:

        item | cost
        chicken | 12.00

        The first line is a header followed by each item and its corresponding cost on a new line.
        """
        print("item | cost")
        for k, v in self.menu.menu.items():
            print(f"{k} | {v}")

    # Random Number Generation, Object Instantiation(Object Oriented Programming)
    def create_order(self) -> Order:
        """
        Create a new order for the customer.

        The order will have a 4-digit unique id, an empty list of items, and a cost of 0.

        Returns:
            Order: A new Order instance.
        """
        uuid = random.randint(1000, 9999)
        return Order(uuid)

    def clear_order(self, order: Order):
        """
        Clear the order by removing all items and resetting the cost to zero.

        After clearing, prints:
            Order cleared.
        
        Args:
            order (Order): The order to be cleared.
        """
        order.items.clear()
        order.cost = 0
        print("Order cleared.")

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
        
        print("Order Summary:")
        for item in order.items:
            print(f"{item} - ${self.menu.menu[item]}")
        print(f"Total: ${order.cost}")

    # Conditional Statements(If-Else), String Interpolation, List
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
        if item in self.menu.menu:
            order.items.append(item)
            order.cost = self.calculate_order_cost(order)
            print(f"Added {item}: {self.menu.menu[item]}")
            return item

        print("Not on menu")

    # Conditional Statements(If-Else), String Interpolation, List, Function calling
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
        if item in order.items:
            order.items.remove(item)
            order.cost = self.calculate_order_cost(order)
            print(f"Removed {item}")
            return True

        print("Not ordered")
        return False

    # Loops, Dictionary Access,
    def calculate_order_cost(self, order: Order):
        """
        Calculate the total cost of the order based on the items ordered.

        Args:
            order (Order): The order for which the cost is calculated.

        Returns:
            float: The total cost computed from the menu prices.
        """
        cost = 0
        for i in order.items:
            cost += self.menu.menu[i]
        return cost

    # String Interpolation, Looping(), string formating
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
        print(f"{self.name}:")
        print("-----")
        for item in order.items:
            print(f"{item} .. {self.menu.menu[item]}")
        print("-----")
        print(f"{order.cost}")


# Object Oriented Programming(Encapsulation), Class, List Operations, Dictionary Operation
class Restaurant:
    def __init__(self):
        self.inventory = {"chicken": 4, "pork": 3, "vegetables": 12, "rice": 7}
        self.cook_time_in_minutes = {
            "chicken": 15,
            "pork": 12,
            "vegetables": 10,
            "rice": 30,
        }
        self.order_queue: List[Order] = []

    # List Operations,
    def add_to_queue(self, order: Order):
        """
        Add an incoming order to the restaurant's order queue.

        Args:
            order (Order): The order to be added.
        """
        self.order_queue.append(order)

    # List Operations, Tuple, Looping, Function calling
    def cook_order(self) -> Tuple[str, int]:
        """
        Process the latest order in the queue if there is sufficient inventory.

        For each item in the order, if available in inventory, the inventory is decremented
        and the item's cooking time is added to the total time.

        Returns:
            tuple: A tuple containing the order id and the total cooking time in minutes.
        """

        order = self.order_queue.pop()
        time = 0
        for item in order.items:
            if self.inventory_helper(item):
                time += self.cook_time_helper(item)
        return (order.id, time)

    def view_inventory(self):
        """
        Display the current inventory in the following format:

            Current Inventory:
            item: quantity
        """
        print("Current Inventory:")
        for item, quantity in self.inventory.items():
            print(f"{item}: {quantity}")

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
        if item in self.inventory:
            self.inventory[item] += amount
            print(f"Restocked {item}. New quantity: {self.inventory[item]}")
        else:
            print(f"{item} not found in inventory.")

    # Dictionary Operations,
    def cook_time_helper(self, item: str):
        """
        Retrieve the cooking time for a specific item.

        Args:
            item (str): The name of the item.

        Returns:
            int: The cooking time in minutes for the item.
        """
        return self.cook_time_in_minutes[item]

    # Conditional Statements(If-Else), Dictionary Operations
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
        total_time = sum(
            self.cook_time_helper(item)
            for order in self.order_queue
            for item in order.items
        )
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
