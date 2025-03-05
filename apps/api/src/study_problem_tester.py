import random
from typing import List, Tuple
from study_problem_classes import Menu, Order, Customer, Restaurant





def view_menu(customer: Customer):
    """
    Display the menu items with their cost in the following format:

    item | cost
    chicken | 12.00

    The first line is a header followed by each item and its corresponding cost on a new line.
    """
    print("item | cost")

    for k, v in customer.menu.menu.items():
        print(f"{k} | {v}")


def create_order(customer:Customer) -> Order:
    """
    Create a new order for the customer.

    The order will have a 4-digit unique id, an empty list of items, and a cost of 0.

    Returns:
        Order: A new Order instance.
    """
    uuid = random.randint(1000, 9999)
    return Order(uuid)

def clear_order( customer:Customer,order: Order):
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

def view_order_summary(customer:Customer,order: Order):
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
        print(f"{item} - ${customer.menu.menu[item]}")
    print(f"Total: ${order.cost}")


def add_to_order(customer:Customer, order: Order, item: str):
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
    if item in customer.menu.menu:
        order.items.append(item)
        order.cost = calculate_order_cost(customer,order)
        print(f"Added {item}: {customer.menu.menu[item]}")
        return item

    print("Not on menu")


def remove_from_order(customer:Customer, order: Order, item: str) -> bool:
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
        order.cost = calculate_order_cost(customer,order)
        print(f"Removed {item}")
        return True

    print("Not ordered")
    return False


def calculate_order_cost( customer:Customer,order: Order):
    """
    Calculate the total cost of the order based on the items ordered.

    Args:
        order (Order): The order for which the cost is calculated.

    Returns:
        float: The total cost computed from the menu prices.
    """
    cost = 0
    for i in order.items:
        cost += customer.menu.menu[i]
    return cost


def get_receipt(customer:Customer, order: Order):
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
    print(f"{customer.name}:")
    print("-----")
    for item in order.items:
        print(f"{item} .. {customer.menu.menu[item]}")
    print("-----")
    print(f"{order.cost}")



def add_to_queue( restaurant:Restaurant,order: Order):
    """
    Add an incoming order to the restaurant's order queue.

    Args:
        order (Order): The order to be added.
    """
    restaurant.order_queue.append(order)


def cook_order(restaurant:Restaurant) -> Tuple[str, int]:
    """
    Process the latest order in the queue if there is sufficient inventory.

    For each item in the order, if available in inventory, the inventory is decremented
    and the item's cooking time is added to the total time.

    Returns:
        tuple: A tuple containing the order id and the total cooking time in minutes.
    """

    order = restaurant.order_queue.pop()
    time = 0
    for item in order.items:
        if inventory_helper(restaurant,item):
            time += cook_time_helper(restaurant,item)
    return (order.id, time)

def view_inventory(restaurant:Restaurant):
    """
    Display the current inventory in the following format:

        Current Inventory:
        item: quantity
    """
    print("Current Inventory:")
    for item, quantity in restaurant.inventory.items():
        print(f"{item}: {quantity}")

def restock_inventory(restaurant:Restaurant, item: str, amount: int):
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


def cook_time_helper(restaurant:Restaurant, item: str):
    """
    Retrieve the cooking time for a specific item.

    Args:
        item (str): The name of the item.

    Returns:
        int: The cooking time in minutes for the item.
    """
    return restaurant.cook_time_in_minutes[item]


def inventory_helper(restaurant:Restaurant, item: str):
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

def average_cook_time(restaurant:Restaurant):
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
        cook_time_helper(restaurant,item)
        for order in restaurant.order_queue
        for item in order.items
    )
    avg_time = total_time / len(restaurant.order_queue)
    print(f"Average cooking time: {avg_time:.2f} minutes.")
    return avg_time


restaurant = Restaurant()
customer = Customer("Alice")


def run():
    view_menu(customer)
    order = create_order(customer)
    add_to_order(customer, order, "chicken")
    add_to_order(customer, order, "beef")
    add_to_order(customer, order, "vegetables")

    remove_from_order(customer, order, "vegetables")
    remove_from_order(customer, order, "beef")

    get_receipt(customer, order)

    add_to_queue(restaurant, order)
    (id, time) = cook_order(restaurant)
    print(id, time)


run()
