from typing import List, Tuple
import io
import sys
import pytest
from unittest.mock import patch

from study_problem_classes import Menu, Order, Customer, Restaurant
import study_problem_tester as testfile


@pytest.fixture()
def customer():
    customer = Customer("amy")
    customer.order[1234] = Order(1234)
    return customer


@pytest.fixture()
def customer_with_order():
    customer = Customer("bob")
    customer.order[1234] = Order(1234, ["beef", "stew"], 17.00)
    customer.order[5678] = Order(5678, ["stew"], 5.00)
    return customer


@pytest.fixture()
def menu():
    menu = Menu()
    menu.dishes = {"beef": 12.00, "stew": 5.00, "vegetables": 9.00}
    return menu


@pytest.fixture()
def restaurant():
    restaurant = Restaurant()
    restaurant.cook_time_in_minutes = {"beef": 3, "stew": 2, "vegetables": 1}
    restaurant.inventory = {"beef": 1, "stew": 1, "vegetables": 1}
    return restaurant


def test_view_menu_with_regular_menu(menu, capsys):
    """Test view_menu with complete menu"""
    testfile.view_menu(menu)
    captured = capsys.readouterr()
    # Expected: header plus each item on a new line.
    expected_output = "item | cost\nbeef | 12.0\nstew | 5.0\nvegetables | 9.0\n"
    assert captured.out == expected_output


def test_view_menu_empty_menu(menu, capsys):
    """Test view_menu with empty menu"""
    menu.dishes = {}
    testfile.view_menu(menu)
    captured = capsys.readouterr()
    assert captured.out == "item | cost\n"


def test_create_order_is_4_digit(customer):
    """Test that the Order ID is a four-digit number"""
    with patch("random.randint", return_value=1000):
        testfile.create_order(customer)
        assert isinstance(customer.order[1000], Order)


def test_create_order_is_unique(customer):
    """Test that the Order ID is a four-digit number"""
    with patch("random.randint", side_effect=[1234, 5678]):
        order_id = testfile.create_order(customer)
    assert order_id != 1234
    assert order_id == 5678
    assert order_id in customer.order


def test_create_order_multiple_orders(customer):
    """Test creating multiple orders generates unique IDs"""
    for i in range(10):
        testfile.create_order(customer)
    assert len(customer.order.keys()) == 11


def test_clear_order(customer, menu, capsys):
    """Test clear_order to ensure order is properly cleared"""
    menu.dishes = {"chicken": 12.00, "rice": 5.00}
    id = testfile.create_order(customer)
    customer.order[id].items = ["chicken", "rice"]
    customer.order[id].cost = 17.00
    testfile.clear_order(customer, id)
    captured = capsys.readouterr()
    assert customer.order[id].items == []
    assert customer.order[id].cost == 0
    assert captured.out == "Order cleared.\n"


def test_view_order_summary(menu, capsys):
    """Test view_order_summary is printing"""
    order = Order("Bobby", ["beef", "stew"], 17)
    testfile.view_order_summary(order, menu)
    captured = capsys.readouterr()
    expected_output = (
            "Order Summary:\nbeef - $12.00\nstew - $5.00\nTotal: $17.00\n"
    )
    assert expected_output == captured.out


def test_add_to_order_success(customer, menu):
    order_id = 1234
    item = "beef"
    with patch("study_problem_tester.calculate_order_cost", return_value=12.00):
        result = testfile.add_to_order(customer, order_id, menu, item)

    assert result == item
    assert item in customer.order[order_id].items
    assert customer.order[order_id].cost == 12.00


def test_add_to_order_multiple_items(customer, menu):
    order_id = 1234
    with patch("study_problem_tester.calculate_order_cost", return_value=17.00):
        testfile.add_to_order(customer, order_id, menu, "beef")
        testfile.add_to_order(customer, order_id, menu, "stew")

    assert "beef" in customer.order[order_id].items
    assert "stew" in customer.order[order_id].items


def test_add_to_order_multiple_same_items(customer, menu):
    """Test adding same item multiple times"""
    order_id = 1234
    with patch("study_problem_tester.calculate_order_cost", return_value=24.00):
        testfile.add_to_order(customer, order_id, menu, "beef")
        testfile.add_to_order(customer, order_id, menu, "beef")

    assert customer.order[order_id].items.count("beef") == 2
    assert customer.order[order_id].cost == 24.00


def test_add_to_order_item_not_on_menu(customer, menu, capsys):
    order_id = 1234
    item = "sushi"

    result = testfile.add_to_order(customer, order_id, menu, item)

    assert result is None
    assert item not in customer.order[order_id].items
    captured = capsys.readouterr()
    assert "Not on menu\n" == captured.out


def test_add_to_order_no_order_found(customer, menu, capsys):
    order_id = 9999  # Nonexistent order
    item = "burger"

    result = testfile.add_to_order(customer, order_id, menu, item)

    assert result is None
    captured = capsys.readouterr()
    assert "No order found\n" == captured.out


def test_remove_from_order_success(customer_with_order, menu, capsys):
    order_id = 1234
    item = "beef"

    result = testfile.remove_from_order(customer_with_order, order_id, menu, item)

    assert result is True
    assert item not in customer_with_order.order[order_id].items
    with patch("study_problem_tester.calculate_order_cost", return_value=5.00):
        customer_with_order.order[order_id].cost = 5.00

    captured = capsys.readouterr()
    assert "Removed beef\n" == captured.out


def test_remove_from_order_not_in_order(customer_with_order, menu, capsys):
    order_id = 1234
    item = "sushi"

    result = testfile.remove_from_order(customer_with_order, order_id, menu, item)

    assert result is False
    captured = capsys.readouterr()
    assert "Not ordered\n" == captured.out


def test_remove_from_order_no_order_found(customer, menu, capsys):
    order_id = 9999  # Nonexistent order
    item = "burger"

    result = testfile.remove_from_order(customer, order_id, menu, item)

    assert result is False
    captured = capsys.readouterr()
    assert "No order found\n" == captured.out


def test_calculate_order_cost(customer_with_order, menu):
    order = customer_with_order.order[1234]
    cost = testfile.calculate_order_cost(order, menu)
    assert cost == 17.00


def test_get_receipt(customer_with_order, menu, capsys):
    testfile.get_receipt(customer_with_order, menu)
    captured = capsys.readouterr()
    expected = (
        "bob\n"
        "-----\n"
        "1234\n"
        "Order Summary:\n"
        "beef - $12.00\n"
        "stew - $5.00\n"
        "Total: $17.00\n"
        "-----\n"
        "5678\n"
        "Order Summary:\n"
        "stew - $5.00\n"
        "Total: $5.00\n"
        "-----\n"
        "$22.00\n"
    )
    assert expected == captured.out


def test_add_to_queue_success(restaurant, customer):
    testfile.add_to_queue(restaurant, customer)
    assert customer.order[1234] in restaurant.order_queue


def test_add_to_queue_multiple_orders(restaurant, customer_with_order):
    testfile.add_to_queue(restaurant, customer_with_order)
    assert customer_with_order.order[1234] in restaurant.order_queue
    assert customer_with_order.order[5678] in restaurant.order_queue


def test_cook_order_success(restaurant, customer_with_order):
    testfile.add_to_queue(restaurant, customer_with_order)

    result = testfile.cook_order(restaurant)
    assert (5678, 2) == result
    assert len(restaurant.order_queue) == 1


def test_cook_order_empty_queue(restaurant):
    assert len(restaurant.order_queue) == 0
    result = testfile.cook_order(restaurant)
    assert (-1, 0) == result


def test_cook_order_no_ingredients(restaurant, customer_with_order):
    testfile.add_to_queue(restaurant, customer_with_order)

    result = testfile.cook_order(restaurant)
    assert (5678, 2) == result
    assert len(restaurant.order_queue) == 1

    result = testfile.cook_order(restaurant)
    assert (-1, 0) == result
    assert len(restaurant.order_queue) == 0


def test_cook_time_helper_success(restaurant):
    assert testfile.cook_time_helper(restaurant, "beef") == 3
    assert testfile.cook_time_helper(restaurant, "stew") == 2
    assert testfile.cook_time_helper(restaurant, "vegetables") == 1


def test_cook_time_helper_fail(restaurant):
    assert testfile.cook_time_helper(restaurant, "spoon") == -1


def test_inventory_helper_success(restaurant):
    original_quantity = restaurant.inventory["stew"]
    result = testfile.inventory_helper(restaurant, "stew")
    assert result is True
    assert restaurant.inventory["stew"] == original_quantity - 1


def test_inventory_helper_failure(restaurant):
    restaurant.inventory["stew"] = 0
    result = testfile.inventory_helper(restaurant, "stew")
    assert result is False
    assert restaurant.inventory["stew"] == 0


def test_average_cook_time_empty_queue(restaurant, capsys):
    avg_time = testfile.average_cook_time(restaurant)
    captured = capsys.readouterr()
    assert avg_time == 0
    assert "No orders in queue.\n" == captured.out


def test_average_cook_time_nonempty_queue(restaurant, customer_with_order, capsys):
    testfile.add_to_queue(restaurant, customer_with_order)
    total_time = (
                restaurant.cook_time_in_minutes["beef"]
                + 2 * restaurant.cook_time_in_minutes["stew"]
            )
    expected_avg = total_time / 2
    avg_time = testfile.average_cook_time(restaurant)
    captured = capsys.readouterr()
    assert avg_time == pytest.approx(expected_avg)
    assert f"Average cooking time: {expected_avg:.2f} minutes.\n" == captured.out
