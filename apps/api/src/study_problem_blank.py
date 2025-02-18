import random
from typing import List, Tuple


class Menu:
    def __init__(self):
        self.menu = {"chicken": 12.00, "pork": 10.00, "vegetables": 9.00, "rice": 12.00}


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
          - A random 4 digit id
          - The items orders
          - The total cost
        """
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
        self.inventory = {"chicken": 4, "pork": 3, "vegetables": 12, "rice": 7}
        self.cook_time_in_minutes = {
            "chicken": 15,
            "pork": 12,
            "vegetables": 10,
            "rice": 30,
        }
        self.order_queue: List[Order] = []

    def add_to_queue(self, order: Order):
        """
        Add incoming order to the queue
        """
        pass

    def cook_order(self) -> Tuple[str, int]:
        """
        Pop the latest order check if there is enough inventory and there is an
        order to cook

        - If there is nothing in the queue return (-1, 0)
        - If there is not enough ingredients return (id, 0)

        When an item is cooked remove one from the inventory

        Return back a tuple with id and the time to cook: (id, time_to_cook)
        """
        pass

    def cook_time_helper(self, item: str):
        pass

    def inventory_helper(self, item: str):
        pass


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
