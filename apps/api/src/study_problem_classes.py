from typing import List, Dict


class Menu:
    def __init__(self):
        self.dishes = {"chicken": 12.00, "pork": 10.00, "vegetables": 9.00, "rice": 12.00}


class Order:
    def __init__(self, uuid=0, items=None, cost=0):
        self.id = uuid
        self.items: List[str] = items if items is not None else []
        self.cost = cost


class Customer:
    def __init__(self, name):
        self.name = name
        self.order: Dict[int, Order] = {}


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
