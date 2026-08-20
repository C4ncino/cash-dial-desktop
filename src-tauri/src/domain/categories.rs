use std::collections::{HashMap, HashSet, VecDeque};
use std::fmt;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CategoryError {
    NotFound(i32),
    Cycle(i32),
}

impl fmt::Display for CategoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound(id) => write!(formatter, "La categoría {id} no existe"),
            Self::Cycle(id) => {
                write!(formatter, "La jerarquía de categorías contiene un ciclo en {id}")
            }
        }
    }
}

#[derive(Clone, Debug)]
pub struct CategoryHierarchy {
    parents: HashMap<i32, Option<i32>>,
    children: HashMap<i32, Vec<i32>>,
}

impl CategoryHierarchy {
    pub fn new(entries: impl IntoIterator<Item = (i32, Option<i32>)>) -> Self {
        let parents = entries.into_iter().collect::<HashMap<_, _>>();
        let mut children = HashMap::<i32, Vec<i32>>::new();
        for (&id, &parent) in &parents {
            if let Some(parent) = parent {
                children.entry(parent).or_default().push(id);
            }
        }
        for values in children.values_mut() {
            values.sort_unstable();
            values.dedup();
        }
        Self { parents, children }
    }

    pub fn ancestor_ids(&self, start_id: i32) -> Result<Vec<i32>, CategoryError> {
        if !self.parents.contains_key(&start_id) {
            return Err(CategoryError::NotFound(start_id));
        }

        let mut result = Vec::new();
        let mut visited = HashSet::new();
        let mut current = Some(start_id);
        while let Some(id) = current {
            if !visited.insert(id) {
                return Err(CategoryError::Cycle(id));
            }
            result.push(id);
            current = self.parents.get(&id).copied().flatten();
            if let Some(parent) = current {
                if !self.parents.contains_key(&parent) {
                    return Err(CategoryError::NotFound(parent));
                }
            }
        }
        Ok(result)
    }

    /// Returns the known ancestor path and stops before revisiting a category.
    ///
    /// This is intended for best-effort aggregation paths, where a malformed
    /// hierarchy must not loop forever but the categories already visited are
    /// still useful. Validation paths should use `ancestor_ids` so cycles are
    /// reported explicitly.
    pub fn ancestor_ids_until_cycle(&self, start_id: i32) -> Result<Vec<i32>, CategoryError> {
        if !self.parents.contains_key(&start_id) {
            return Err(CategoryError::NotFound(start_id));
        }

        let mut result = Vec::new();
        let mut visited = HashSet::new();
        let mut current = Some(start_id);
        while let Some(id) = current {
            if !visited.insert(id) {
                break;
            }
            result.push(id);
            current = self.parents.get(&id).copied().flatten();
            if let Some(parent) = current {
                if !self.parents.contains_key(&parent) {
                    return Err(CategoryError::NotFound(parent));
                }
            }
        }
        Ok(result)
    }

    pub fn descendant_ids(&self, start_id: i32) -> Result<Vec<i32>, CategoryError> {
        if !self.parents.contains_key(&start_id) {
            return Err(CategoryError::NotFound(start_id));
        }

        let mut result = Vec::new();
        let mut visited = HashSet::new();
        let mut queue = VecDeque::from([start_id]);
        while let Some(id) = queue.pop_front() {
            if !visited.insert(id) {
                return Err(CategoryError::Cycle(id));
            }
            result.push(id);
            if let Some(children) = self.children.get(&id) {
                queue.extend(children.iter().copied());
            }
        }
        Ok(result)
    }

    pub fn is_descendant_of(&self, candidate: i32, ancestor: i32) -> Result<bool, CategoryError> {
        Ok(self.ancestor_ids(candidate)?.contains(&ancestor))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn traverses_ancestors_and_descendants() {
        let hierarchy =
            CategoryHierarchy::new([(1, None), (2, Some(1)), (3, Some(2)), (4, Some(1))]);
        assert_eq!(hierarchy.ancestor_ids(3).unwrap(), vec![3, 2, 1]);
        assert_eq!(hierarchy.descendant_ids(1).unwrap(), vec![1, 2, 4, 3]);
        assert!(hierarchy.is_descendant_of(3, 1).unwrap());
    }

    #[test]
    fn reports_missing_nodes_and_cycles() {
        let hierarchy = CategoryHierarchy::new([(1, Some(2)), (2, Some(1))]);
        assert_eq!(hierarchy.ancestor_ids(1), Err(CategoryError::Cycle(1)));
        assert_eq!(hierarchy.ancestor_ids_until_cycle(1).unwrap(), vec![1, 2]);
        assert_eq!(hierarchy.ancestor_ids(99), Err(CategoryError::NotFound(99)));
    }
}
