import random
from typing import List, Tuple, Optional
from study_problem_classes import Menu, Order, Customer, Restaurant


def view_menu(menu: Menu):
    """
    Display the menu items with their cost in the following format:

    item | cost
    chicken | 12.00

    The first line is a header followed by each item and its corresponding cost on a new line.
    """
    print("item | cost")
    for k, v in menu.dishes.items():
        print(f"{k} | {v}")


def create_order(customer: Customer) -> int:
    """
    Create a new order for the customer.

    The order will have a 4-digit unique id, an empty list of items, and a cost of 0.

    Note: Check if the uuid is not already an order, if it is pick a new uuid
    """
    uuid = random.randint(1000, 9999)
    while uuid in customer.order:
        uuid = random.randint(1000, 9999)
    customer.order[uuid] = Order(uuid)
    return uuid


def clear_order(customer: Customer, order_id: int):
    """
    Clear the order from the customer by removing all items and resetting the
    cost to zero.

    After clearing, prints:
        Order cleared.

    Args:
        order (Order): The order to be cleared.
    """
    customer.order[order_id].items.clear()
    customer.order[order_id].cost = 0
    print("Order cleared.")


def view_order_summary(order: Order, menu: Menu):
    """
    Print a summary of the order including each item with its cost and the total cost.

    Note: Use `format(x, '.2f')` or `x:.2f` to format to the second decimal

    Expected output format:
        Order Summary:
        chicken - $12.00
        pork - $10.00
        Total: $22.00

    Args:
        order (Order): The order to summarize.
    """
    print("Order Summary:")
    for item in order.items:
        print(f"{item} - ${menu.dishes[item]:.2f}")
    print(f"Total: ${calculate_order_cost(order, menu):.2f}")


def add_to_order(customer: Customer, order_id: int, menu: Menu, item: str):
    """
    Add an item to the order if it exists on the menu and update the total cost.

    Args:
        order_id (int): The order to update.
        item (str): The item to add.

    Returns:
        str: The name of the item if added successfully.

    Prints:
        "Added [item]: [cost]" if the item is on the menu.
        "Not on menu" if the item is not available.
        "No order found" if the order_id is not found.
    """
    if order_id in customer.order:
        order = customer.order[order_id]
        if item in menu.dishes:
            order.items.append(item)
            order.cost = calculate_order_cost(order, menu)
            print(f"Added {item}: {menu.dishes[item]}")
            return item
        print("Not on menu")
    else:
        print("No order found")


def remove_from_order(customer: Customer, order_id: int, menu: Menu, item: str) -> bool:
    """
    Remove an item from the customer's order if it exists and update the total cost.

    Args:
        order (Order): The order from which the item should be removed.
        item (str): The item to remove.

    Returns:
        bool: True if the item was removed; False if the item was not found in the order.

    Prints:
        "Removed [item]" if the removal is successful.
        "Not ordered" if the item is not in the order.
        "No order found" if the order_id is not found.
    """

    if order_id in customer.order:
        order = customer.order[order_id]
        if item in order.items:
            order.items.remove(item)
            order.cost = calculate_order_cost(order, menu)
            print(f"Removed {item}")
            return True
        else:
            print("Not ordered")
            return False
    else:
        print("No order found")
        return False


def calculate_order_cost(order: Order, menu: Menu):
    """
    Calculate the total cost of the order based on the items ordered.

    Args:
        order (Order): The order for which the cost is calculated.

    Returns:
        float: The total cost computed from the menu prices.
    """
    cost = 0
    for i in order.items:
        cost += menu.dishes[i]
    return cost


def get_receipt(customer: Customer, menu: Menu):
    """
    Print all Orders from the customer:

        [Customer name]:
        -----
        [Order Id]
        Order Summary:
        [item ordered] - $[cost of item]
        [item ordered] - $[cost of item]
        Total: $[total cost of order]
        -----
        [Order Id]
        Order Summary:
        [item ordered] - $[cost of item]
        [item ordered] - $[cost of item]
        Total: $[total cost of order]
        -----
        $[total cost of all orders]

    The output must exactly follow this format.

    Args:
        customer (Customer): The customer orders to generate the receipt.
        menu (Menu): The menu of the restaurant.
    """
    total = 0
    print(customer.name)
    print("-----")
    for k, v in customer.order.items():
        print(k)
        view_order_summary(v, menu)
        print("-----")
        total += customer.order[k].cost
    print(f"${total:.2f}")


def add_to_queue(restaurant: Restaurant, customer: Customer):
    """
    Add an incoming customer orders to the restaurant's order queue.

    Args:
        customer (Customer): The customer whose order is to be added.
    """
    for id, order in customer.order.items():
        restaurant.order_queue.append(order)


def cook_order(restaurant: Restaurant) -> Tuple[str, int]:
    """
    Process the latest order in the queue if there is sufficient inventory.

    For each item in the order, if available in inventory, the inventory is decremented
    and the item's cooking time is added to the total time.

    Returns:
        tuple: A tuple containing the order id and the total cooking time in minutes.
        If the queue is empty or the inventory runs out return (-1, 0)
    """
    if restaurant.order_queue:
        order = restaurant.order_queue.pop()
        time = 0
        for item in order.items:
            if inventory_helper(restaurant, item):
                time += cook_time_helper(restaurant, item)
            else:
                return (-1, 0)

        return (order.id, time)

    return (-1, 0)


def restock_inventory(restaurant: Restaurant, item: str, amount: int):
    """
    Restock the inventory with a given amount for a specified item.

    Args:
        item (str): The item to restock.
        amount (int): The number of units to add.

    Prints:
        "Restocked [item]. New quantity: [quantity]" if the item exists.
        "[item] not found in inventory." if the item is not in the inventory.
    """
    if item in restaurant.inventory:
        restaurant.inventory[item] += amount
        print(f"Restocked {item}. New quantity: {restaurant.inventory[item]}")
    else:
        print(f"{item} not found in inventory.")


def cook_time_helper(restaurant: Restaurant, item: str):
    """
    Retrieve the cooking time for a specific item.

    Args:
        item (str): The name of the item.

    Returns:
        int: The cooking time in minutes for the item or -1 if not found.
    """
    return restaurant.cook_time_in_minutes[item] if item in restaurant.cook_time_in_minutes else -1


def inventory_helper(restaurant: Restaurant, item: str):
    """
    Check if the item is available in inventory and decrement its quantity by one if available.

    Args:
        item (str): The item to check.

    Returns:
        bool: True if the item was available and decremented; False otherwise.
    """
    if restaurant.inventory[item] > 0:
        restaurant.inventory[item] -= 1
        return True
    return False


def average_cook_time(restaurant: Restaurant):
    """
    Calculate and print the average cooking time for all orders in the queue.

    Returns:
        float: The average cooking time in minutes. Returns 0 if there are no orders.

    Prints:
        "Average cooking time: [average] minutes." if orders exist, or
        "No orders in queue." if the queue is empty.
    """

    if not restaurant.order_queue:
        print("No orders in queue.")
        return 0
    total_time = sum(
        cook_time_helper(restaurant, item)
        for order in restaurant.order_queue
        for item in order.items
    )
    avg_time = total_time / len(restaurant.order_queue)
    print(f"Average cooking time: {avg_time:.2f} minutes.")
    return avg_time


restaurant = Restaurant()
customer = Customer("Alice")
menu = Menu()


def run():
    view_menu(menu)
    id = create_order(customer)
    add_to_order(customer, id, menu, "chicken")
    add_to_order(customer, id, menu, "beef")
    add_to_order(customer, id, menu, "vegetables")

    remove_from_order(customer, id, menu, "vegetables")
    remove_from_order(customer, id, menu, "beef")

    get_receipt(customer, menu)

    add_to_queue(restaurant, customer)
    (id, time) = cook_order(restaurant)
    print(id, time)


run()
