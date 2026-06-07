def second_in_line_message(customer_name: str, barber_name: str) -> str:
    return (
        f"Habari {customer_name}! 💈\n"
        f"Uko wa pili foleni kwa {barber_name}.\n"
        f"Tafadhali rudi dukani sasa hivi.\n\n"
        f"Hi {customer_name}! You're 2nd in line "
        f"with {barber_name}. Head back to the shop now!"
    )


def your_turn_message(customer_name: str, barber_name: str) -> str:
    return (
        f"Ni zamu yako, {customer_name}! ✂️\n"
        f"{barber_name} anakusubiri sasa.\n\n"
        f"It's your turn, {customer_name}! "
        f"{barber_name} is ready for you now. Come on in!"
    )


def requeued_message(customer_name: str, barber_name: str, position: int) -> str:
    return (
        f"Habari {customer_name}. Tulikupigia lakini hukuja.\n"
        f"Umewekwa tena foleni — nafasi #{position} kwa {barber_name}.\n\n"
        f"Hi {customer_name}, we called but you weren't there. "
        f"We've re-added you to the queue at position #{position} "
        f"with {barber_name}."
    )