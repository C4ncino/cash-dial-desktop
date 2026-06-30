-- Your SQL goes here
CREATE TABLE categories (
    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(45) NOT NULL UNIQUE,
    father_id INTEGER
        REFERENCES categories(id)
        ON DELETE SET NULL,
    icon VARCHAR(25) NOT NULL,
    color CHAR(7) NOT NULL
        CHECK(color GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'),
    FOREIGN KEY(father_id)
        REFERENCES categories(id)
);

CREATE TABLE categories_translations (
    category_id INTEGER NOT NULL,
    lang CHAR(2) NOT NULL
        CHECK(lang GLOB '[a-z][a-z]'),
    name TEXT NOT NULL,
    PRIMARY KEY(category_id, lang),
    FOREIGN KEY(category_id)
        REFERENCES categories(id)
        ON DELETE CASCADE
);

INSERT INTO categories (father_id, icon, color, key)
VALUES
    (NULL, 'apple', '#00a63e', 'food'),
    (NULL,'shopping-bag', '#00b8db', 'shopping'),
    (NULL, 'home-alt-slim-horiz', '#e17100', 'housing'),
    (NULL, 'car', '#ec003f', 'transport'),
    (NULL, 'user-love', '#009966', 'life_wellness'),
    (NULL, 'sparks', '#8e51ff', 'entertainment'),
    (NULL, 'graduation-cap', '#e60076', 'education'),
    (NULL, 'antenna', '#51a2ff', 'communications'),
    (NULL, 'bank', '#fe9a00', 'finance'),
    (NULL, 'reports', '#fb2c36', 'investments'),
    (NULL, 'receive-dollars', '#ff6900', 'income'),
    (NULL, 'box', '#4a5565', 'other'),

    (1, 'cart', '#00a63e', 'food_groceries'),
    (1, 'c-square', '#00a63e', 'food_costco'),
    (1, 'cutlery', '#00a63e', 'food_restaurant'),
    (1, 'coffee-cup', '#00a63e', 'food_coffee'),
    (1, 'glass-fragile', '#00a63e', 'food_alcohol'),
    (1, 'glass-half', '#00a63e', 'food_drinks'),

    (2, 'apple-imac-2021', '#00b8db', 'shopping_electronics'),
    (2, 'shirt', '#00b8db', 'shopping_clothing'),
    (2, 'glasses', '#00b8db', 'shopping_accessories'),
    (2, 'heart', '#00b8db', 'shopping_health_beauty'),
    (2, 'stroller', '#00b8db', 'shopping_kids'),
    (2, 'home-alt', '#00b8db', 'shopping_home'),
    (2, 'wolf', '#00b8db', 'shopping_pets'),
    (2, 'ev-plug', '#00b8db', 'shopping_tech'),
    (2, 'laptop', '#00b8db', 'shopping_computers'),
    (2, 'gift', '#00b8db', 'shopping_gifts'),
    (2, 'empty-page', '#00b8db', 'shopping_stationery'),
    (2, 'pharmacy-cross-tag', '#00b8db', 'shopping_pharmacy'),
    (2, 'tools', '#00b8db', 'shopping_tools'),
    (2, 'pc-check', '#00b8db', 'shopping_software'),

    (3, 'home-user', '#e17100', 'housing_rent'),
    (3, 'home-sale', '#e17100', 'housing_mortgage'),
    (3, 'domotic-warning', '#e17100', 'housing_utilities'),
    (3, 'light-bulb', '#e17100', 'housing_energy'),
    (3, 'hammer', '#e17100', 'housing_maintenance'),
    (3, 'home-secure', '#e17100', 'housing_insurance'),

    (4, 'gas-tank-droplet', '#ec003f', 'transport_fuel'),
    (4, 'wrench', '#ec003f', 'transport_maintenance'),
    (4, 'historic-shield', '#ec003f', 'transport_insurance'),
    (4, 'parking', '#ec003f', 'transport_parking'),
    (4, 'hand-card', '#ec003f', 'transport_tolls'),
    (4, 'page', '#ec003f', 'transport_tax'),
    (4, 'page-search', '#ec003f', 'transport_inspection'),
    (4, 'bus', '#ec003f', 'transport_public'),
    (4, 'map-pin', '#ec003f', 'transport_taxi'),
    (4, 'airplane', '#ec003f', 'transport_travel'),

    (5, 'hospital', '#009966', 'wellness_medical'),
    (5, 'flower', '#009966', 'wellness_beauty'),
    (5, 'hourglass', '#009966', 'wellness_hobbies'),
    (5, 'gym', '#009966', 'wellness_sports'),
    (5, 'donate', '#009966', 'wellness_charity'),
    (5, 'sea-and-sun', '#009966', 'wellness_vacation'),

    (6, 'community', '#8e51ff', 'entertainment_events'),
    (6, 'cinema-old', '#8e51ff', 'entertainment_cinema'),
    (6, 'music-double-note', '#8e51ff', 'entertainment_music'),
    (6, 'open-book', '#8e51ff', 'entertainment_books'),
    (6, 'star', '#8e51ff', 'entertainment_subscriptions'),
    (6, 'tv', '#8e51ff', 'entertainment_streaming'),
    (6, 'rocket', '#8e51ff', 'entertainment_toys'),
    (6, 'gamepad', '#8e51ff', 'entertainment_games'),

    (7, 'hand-card', '#e60076', 'education_fees'),
    (7, 'brain-research', '#e60076', 'education_courses'),
    (7, 'open-book', '#e60076', 'education_books'),

    (8, 'internet', '#51a2ff', 'comm_internet'),
    (8, 'phone', '#51a2ff', 'comm_phone'),
    (8, 'send-mail', '#51a2ff', 'comm_postal'),

    (9, 'page', '#fe9a00', 'finance_taxes'),
    (9, 'historic-shield', '#fe9a00', 'finance_insurance'),
    (9, 'hand-cash', '#fe9a00', 'finance_loans'),
    (9, 'privacy-policy', '#fe9a00', 'finance_fines'),
    (9, 'group', '#fe9a00', 'finance_family'),
    (9, 'multi-bubble', '#fe9a00', 'finance_consulting'),

    (10, 'city', '#fb2c36', 'investments_real_estate'),
    (10, 'graph-up', '#fb2c36', 'investments_financial_services'),
    (10, 'piggy-bank', '#fb2c36', 'investments_savings'),

    (11, 'suitcase', '#ff6900', 'income_salary'),
    (11, 'page', '#ff6900', 'income_invoices'),
    (11, 'reports', '#ff6900', 'income_investments'),
    (11, 'cart', '#ff6900', 'income_sales'),
    (11, 'home-user', '#ff6900', 'income_rentals'),
    (11, 'hand-cash', '#ff6900', 'income_loans'),
    (11, 'page-edit', '#ff6900', 'income_checks'),
    (11, 'undo', '#ff6900', 'income_refunds'),
    (11, 'group', '#ff6900', 'income_family'),
    (11, 'gift', '#ff6900', 'income_gifts'),

    (NULL, 'data-transfer-up', '#84cc16', 'transfer');

INSERT INTO categories_translations (category_id, lang, name)
VALUES
    -- Spanish
    (1, 'es', 'Comida y Bebida'),
    (2, 'es', 'Compras'),
    (3, 'es', 'Vivienda'),
    (4, 'es', 'Vehículos y Transporte'),
    (5, 'es', 'Vida y Bienestar'),
    (6, 'es', 'Entretenimiento'),
    (7, 'es', 'Educación'),
    (8, 'es', 'Comunicaciones'),
    (9, 'es', 'Finanzas'),
    (10, 'es', 'Inversiones'),
    (11, 'es', 'Ingresos'),
    (12, 'es', 'Otros'),

    (13, 'es', 'Supermercados'),
    (14, 'es', 'Costco'),
    (15, 'es', 'Restaurantes'),
    (16, 'es', 'Cafeterías'),
    (17, 'es', 'Licorerías'),
    (18, 'es', 'Bares'),

    (19, 'es', 'Compras en línea'),
    (20, 'es', 'Ropa y Calzado'),
    (21, 'es', 'Joyas y Accesorios'),
    (22, 'es', 'Salud y Belleza'),
    (23, 'es', 'Bebés y Niños'),
    (24, 'es', 'Casa y Jardín'),
    (25, 'es', 'Mascotas'),
    (26, 'es', 'Electrodoméstico'),
    (27, 'es', 'Tecnología'),
    (28, 'es', 'Regalos'),
    (29, 'es', 'Papelería'),
    (30, 'es', 'Farmacia'),
    (31, 'es', 'Herramientas'),
    (32, 'es', 'Software'),

    (33, 'es', 'Renta'),
    (34, 'es', 'Impuestos'),
    (35, 'es', 'Hipoteca'),
    (36, 'es', 'Servicios Públicos'),
    (37, 'es', 'Mantenimiento'),
    (38, 'es', 'Seguro'),

    (39, 'es', 'Gasolina'),
    (40, 'es', 'Mantenimiento'),
    (41, 'es', 'Seguro'),
    (42, 'es', 'Estacionamiento'),
    (43, 'es', 'Renta'),
    (44, 'es', 'Tenencia'),
    (45, 'es', 'Verificación'),
    (46, 'es', 'Transporte Público'),
    (47, 'es', "Taxi y Uber"),
    (48, 'es', "Vuelos y Camiones"),

    (49, 'es', "Citas Médicas"),
    (50, 'es', "Bienestar y Belleza"),
    (51, 'es', "Pasatiempos"),
    (52, 'es', "Deporte"),
    (53, 'es', "Caridad"),
    (54, 'es', "Vacaciones"),

    (55, 'es', "Eventos"),
    (56, 'es', "Cine y Teatro"),
    (57, 'es', "Música"),
    (58, 'es', "Libros"),
    (59, 'es', "Suscripciones"),
    (60, 'es', "TV y Streaming"),
    (61, 'es', "Juguetes"),
    (62, 'es', "Videojuegos"),

    (63, 'es', "Cuotas"),
    (64, 'es', "Cursos"),
    (65, 'es', "Libros"),

    (66, 'es', "Internet"),
    (67, 'es', "Telefonía"),
    (68, 'es', "Servicios Postales"),

    (69, 'es', "Impuestos"),
    (70, 'es', "Seguros"),
    (71, 'es', "Préstamos"),
    (72, 'es', "Multas"),
    (73, 'es', "Familiar"),
    (74, 'es', "Asesoramiento"),

    (75, 'es', "Bienes Raíces"),
    (76, 'es', "Financieras"),
    (77, 'es', "Ahorro"),

    (78, 'es', "Sueldo"),
    (79, 'es', "Facturas"),
    (80, 'es', "Inversiones"),
    (81, 'es', "Venta"),
    (82, 'es', "Alquiler"),
    (83, 'es', "Préstamos"),
    (84, 'es', "Cheques"),
    (85, 'es', "Reembolsos"),
    (86, 'es', "Familiar"),
    (87, 'es', "Regalos"),

    (88, 'es', 'Transferencia'),

    -- English
    (1, 'en', 'Food & Drink'),
    (2, 'en', 'Shopping'),
    (3, 'en', 'Housing'),
    (4, 'en', 'Vehicles & Transport'),
    (5, 'en', 'Life & Wellness'),
    (6, 'en', 'Entertainment'),
    (7, 'en', 'Education'),
    (8, 'en', 'Communications'),
    (9, 'en', 'Finance'),
    (10, 'en', 'Investments'),
    (11, 'en', 'Income'),
    (12, 'en', 'Other'),

    -- Food & Drink subcategories
    (13, 'en', 'Supermarkets'),
    (14, 'en', 'Costco'),
    (15, 'en', 'Restaurants'),
    (16, 'en', 'Coffee Shops'),
    (17, 'en', 'Liquor Stores'),
    (18, 'en', 'Bars'),

    -- Shopping subcategories
    (19, 'en', 'Online Shopping'),
    (20, 'en', 'Clothing & Footwear'),
    (21, 'en', 'Jewelry & Accessories'),
    (22, 'en', 'Health & Beauty'),
    (23, 'en', 'Babies & Kids'),
    (24, 'en', 'Home & Garden'),
    (25, 'en', 'Pets'),
    (26, 'en', 'Home Appliances'),
    (27, 'en', 'Technology'),
    (28, 'en', 'Gifts'),
    (29, 'en', 'Stationery'),
    (30, 'en', 'Pharmacy'),
    (31, 'en', 'Tools'),
    (32, 'en', 'Software'),

    -- Housing subcategories
    (33, 'en', 'Rent'),
    (34, 'en', 'Taxes'),
    (35, 'en', 'Mortgage'),
    (36, 'en', 'Utilities'),
    (37, 'en', 'Maintenance'),
    (38, 'en', 'Insurance'),

    -- Transport subcategories
    (39, 'en', 'Fuel'),
    (40, 'en', 'Maintenance'),
    (41, 'en', 'Insurance'),
    (42, 'en', 'Parking'),
    (43, 'en', 'Rent'),
    (44, 'en', 'Vehicle Tax'),
    (45, 'en', 'Inspection'),
    (46, 'en', 'Public Transport'),
    (47, 'en', 'Taxi & Uber'),
    (48, 'en', 'Flights & Bus Travel'),

    -- Life & Wellness
    (49, 'en', 'Medical Appointments'),
    (50, 'en', 'Wellness & Beauty'),
    (51, 'en', 'Hobbies'),
    (52, 'en', 'Sports'),
    (53, 'en', 'Charity'),
    (54, 'en', 'Vacations'),

    -- Entertainment
    (55, 'en', 'Events'),
    (56, 'en', 'Cinema & Theater'),
    (57, 'en', 'Music'),
    (58, 'en', 'Books'),
    (59, 'en', 'Subscriptions'),
    (60, 'en', 'TV & Streaming'),
    (61, 'en', 'Toys'),
    (62, 'en', 'Video Games'),

    -- Education
    (63, 'en', 'Fees'),
    (64, 'en', 'Courses'),
    (65, 'en', 'Books'),

    -- Communications
    (66, 'en', 'Internet'),
    (67, 'en', 'Phone Services'),
    (68, 'en', 'Postal Services'),

    -- Finance
    (69, 'en', 'Taxes'),
    (70, 'en', 'Insurance'),
    (71, 'en', 'Loans'),
    (72, 'en', 'Fines'),
    (73, 'en', 'Family'),
    (74, 'en', 'Consulting'),

    -- Investments
    (75, 'en', 'Real Estate'),
    (76, 'en', 'Financial Services'),
    (77, 'en', 'Savings'),

    -- Income
    (78, 'en', 'Salary'),
    (79, 'en', 'Invoices'),
    (80, 'en', 'Investments'),
    (81, 'en', 'Sales'),
    (82, 'en', 'Rentals'),
    (83, 'en', 'Loans'),
    (84, 'en', 'Checks'),
    (85, 'en', 'Refunds'),
    (86, 'en', 'Family'),
    (87, 'en', 'Gifts'),

    (88, 'en', 'Transfer');