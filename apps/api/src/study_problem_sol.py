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
        print("item | cost")
        for k, v in self.menu.menu.items():
            print(f"{k} | {v}")

    def create_order(self) -> Order:
        """
        Return a Order with:
          - 4 digit id
          - The items orders
          - The total cost
        """
        uuid = random.randint(1000, 9999)
        return Order(uuid)

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

    def calculate_order_cost(self, order: Order):
        cost = 0
        for i in order.items:
            cost += self.menu.menu[i]
        return cost

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
        self.order_queue.append(order)

    def cook_order(self) -> Tuple[str, int]:
        """
        Pop the latest order check if there is enough inventory and there is an
        order to cook
        If there is not enough inventory or nothing in the queue return (-1, 0)
        When an item is cooked remove one from the inventory

        Return back a tuple with id
        and the time to cook
        """
        if not self.order_queue:
            return (-1, 0)
        order = self.order_queue.pop()
        time = 0
        for item in order.items:
            if self.inventory_helper(item):
                time += self.cook_time_helper(item)
            else:
                return (order.id, 0)
        return (order.id, time)

    def cook_time_helper(self, item: str):
        return self.cook_time_in_minutes[item]

    def inventory_helper(self, item: str):
        if self.inventory[item] <= 0:
            return False
        self.inventory[item] -= 1
        return True


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
